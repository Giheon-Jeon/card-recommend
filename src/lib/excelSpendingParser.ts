import { type ParsedSpendingItem } from "@/lib/importerParser";
import {
  type CustomMerchantRule,
  getStoredMerchantRules,
} from "@/lib/merchantRules";
import {
  inferCategory,
  parseAmountValue,
  parseCsvRows,
  decodeCsvBuffer,
} from "@/lib/csvSpendingParser";

/**
 * [Issue #98] 금융사 엑셀(.xlsx/.xls) 지출 명세서 직접 업로드 및 자동 시트 파싱 지원
 * - 순수 브라우저/Node 표준 API 기반 경량 OpenXML(.xlsx) ZIP & XML 파서 (zero-dependency)
 * - 레거시 금융사 XML Spreadsheet 2003 및 HTML Table(.xls) 포맷 자동 감지 및 파싱
 * - 주요 8개 카드사(신한, 현대, 삼성, KB국민, 롯데, 우리, 하나, NH농협) 엑셀 양식 헤더 자동 매핑
 * - 승인/취소 상태에 따른 음수 환불 금액 처리 및 커스텀 가맹점 규칙 우선 카테고리 자동 추론
 */

export const MAX_EXCEL_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export interface ExcelValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 업로드된 엑셀 파일의 기본 크기 및 확장자 유효성 검증
 */
export function validateExcelFile(file: File): ExcelValidationResult {
  if (file.size > MAX_EXCEL_FILE_SIZE) {
    return {
      isValid: false,
      error: "엑셀 파일 크기는 최대 10MB 이하만 업로드 가능합니다.",
    };
  }

  const fileName = file.name.toLowerCase();
  const fileExt = fileName.substring(fileName.lastIndexOf("."));
  const isExcelExt = fileExt === ".xlsx" || fileExt === ".xls";
  const isExcelMime =
    !file.type ||
    file.type.includes("sheet") ||
    file.type.includes("excel") ||
    file.type === "application/vnd.ms-excel" ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

  if (!isExcelExt && !isExcelMime) {
    return {
      isValid: false,
      error: "올바른 엑셀 형식의 파일(.xlsx, .xls)을 선택해 주세요.",
    };
  }

  return { isValid: true };
}

/**
 * 엑셀 컬럼명(A, B, ..., Z, AA, AB...)을 0-based 열 인덱스로 변환
 */
export function columnNameToIndex(colName: string): number {
  let index = 0;
  const upper = colName.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

/**
 * 셀 참조 좌표(예: "A1", "BC23")에서 열 문자 추출
 */
export function extractColName(cellRef: string): string {
  const match = cellRef.match(/^[A-Za-z]+/);
  return match ? match[0] : "";
}

/**
 * HTML 엔티티 및 XML 특수문자 디코딩
 */
export function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * 표준 DecompressionStream을 사용한 경량 raw deflate 압축 해제
 */
export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  // 환경에 DecompressionStream이 있는 경우 (현대 브라우저 및 Node 18+)
  if (typeof DecompressionStream !== "undefined") {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      writer.write(data);
      writer.close();
      const reader = ds.readable.getReader();
      const chunks: Uint8Array[] = [];
      let totalLen = 0;
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLen += value.length;
        }
      }
      const res = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        res.set(chunk, offset);
        offset += chunk.length;
      }
      return res;
    } catch {
      // 압축 해제 실패 시 폴백
    }
  }

  throw new Error("압축 해제(DecompressionStream)를 지원하지 않는 환경이거나 손상된 압축 데이터입니다.");
}

/**
 * 경량 PKZIP 아카이브 파일 엔트리 추출기
 */
export interface ZipEntry {
  filename: string;
  compressedSize: number;
  uncompressedSize: number;
  compressionMethod: number;
  offset: number;
}

export async function parseZipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const fileMap = new Map<string, Uint8Array>();

  // 1. End of Central Directory (EOCD) 레코드 검색 (시그니처: 0x06054b50)
  let eocdOffset = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (
      bytes[i] === 0x50 &&
      bytes[i + 1] === 0x4b &&
      bytes[i + 2] === 0x05 &&
      bytes[i + 3] === 0x06
    ) {
      eocdOffset = i;
      break;
    }
  }

  const decoder = new TextDecoder("utf-8");

  if (eocdOffset !== -1) {
    const totalEntries = view.getUint16(eocdOffset + 10, true);
    let cdOffset = view.getUint32(eocdOffset + 16, true);

    for (let e = 0; e < totalEntries; e++) {
      if (
        cdOffset + 46 > bytes.length ||
        bytes[cdOffset] !== 0x50 ||
        bytes[cdOffset + 1] !== 0x4b ||
        bytes[cdOffset + 2] !== 0x01 ||
        bytes[cdOffset + 3] !== 0x02
      ) {
        break;
      }

      const method = view.getUint16(cdOffset + 10, true);
      const compSize = view.getUint32(cdOffset + 20, true);
      const nameLen = view.getUint16(cdOffset + 28, true);
      const extraLen = view.getUint16(cdOffset + 30, true);
      const commentLen = view.getUint16(cdOffset + 32, true);
      const localHeaderOffset = view.getUint32(cdOffset + 42, true);

      const filenameBytes = bytes.subarray(cdOffset + 46, cdOffset + 46 + nameLen);
      const filename = decoder.decode(filenameBytes).replace(/\\/g, "/");

      // 로컬 파일 헤더 이동
      if (
        localHeaderOffset + 30 <= bytes.length &&
        bytes[localHeaderOffset] === 0x50 &&
        bytes[localHeaderOffset + 1] === 0x4b &&
        bytes[localHeaderOffset + 2] === 0x03 &&
        bytes[localHeaderOffset + 3] === 0x04
      ) {
        const localNameLen = view.getUint16(localHeaderOffset + 26, true);
        const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
        const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
        const compressedData = bytes.subarray(dataStart, dataStart + compSize);

        if (method === 0) {
          // 비압축
          fileMap.set(filename, compressedData);
        } else if (method === 8) {
          // deflate
          const decompressed = await inflateRaw(compressedData);
          fileMap.set(filename, decompressed);
        }
      }

      cdOffset += 46 + nameLen + extraLen + commentLen;
    }
  } else {
    // EOCD가 없는 단순 스트림인 경우 로컬 헤더 순회 시도
    let offset = 0;
    while (offset + 30 < bytes.length) {
      if (
        bytes[offset] !== 0x50 ||
        bytes[offset + 1] !== 0x4b ||
        bytes[offset + 2] !== 0x03 ||
        bytes[offset + 3] !== 0x04
      ) {
        break;
      }

      const method = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const filename = decoder.decode(bytes.subarray(offset + 30, offset + 30 + nameLen)).replace(/\\/g, "/");
      const dataStart = offset + 30 + nameLen + extraLen;
      const compressedData = bytes.subarray(dataStart, dataStart + compSize);

      if (method === 0) {
        fileMap.set(filename, compressedData);
      } else if (method === 8) {
        try {
          const decompressed = await inflateRaw(compressedData);
          fileMap.set(filename, decompressed);
        } catch {
          // 무시
        }
      }

      offset = dataStart + compSize;
    }
  }

  return fileMap;
}

/**
 * OpenXML sharedStrings.xml 파싱
 */
export function parseSharedStringsXml(xmlText: string): string[] {
  const strings: string[] = [];
  // <si>...</si> 블록 매칭
  const siRegex = /<si\b[^>]*>([\s\S]*?)<\/si>/gi;
  let siMatch: RegExpExecArray | null;

  while ((siMatch = siRegex.exec(xmlText)) !== null) {
    const siContent = siMatch[1];
    // 모든 <t> 태그의 텍스트를 결합
    const tRegex = /<t\b[^>]*>([\s\S]*?)<\/t>/gi;
    let tMatch: RegExpExecArray | null;
    let text = "";
    while ((tMatch = tRegex.exec(siContent)) !== null) {
      text += tMatch[1];
    }
    strings.push(decodeXmlEntities(text));
  }

  return strings;
}

/**
 * OpenXML sheet.xml 파싱하여 2차원 문자열 배열로 변환
 */
export function parseSheetXml(xmlText: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<row\b[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xmlText)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    const cellRegex = /<c\b([^>]*)>([\s\S]*?)<\/c>/gi;
    let cellMatch: RegExpExecArray | null;

    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2];

      const refMatch = attrs.match(/\br="([A-Za-z]+[0-9]+)"/);
      const typeMatch = attrs.match(/\bt="([a-z]+)"/i);

      let colIndex = cells.length;
      if (refMatch) {
        const colLetter = extractColName(refMatch[1]);
        if (colLetter) {
          colIndex = columnNameToIndex(colLetter);
        }
      }

      const cellType = typeMatch ? typeMatch[1] : "";
      let cellValue = "";

      if (cellType === "s") {
        // Shared String 인덱스
        const vMatch = cellBody.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        if (vMatch) {
          const sIndex = parseInt(vMatch[1].trim(), 10);
          cellValue = sharedStrings[sIndex] || "";
        }
      } else if (cellType === "inlineStr") {
        const tMatch = cellBody.match(/<t\b[^>]*>([\s\S]*?)<\/t>/i);
        cellValue = tMatch ? decodeXmlEntities(tMatch[1]) : "";
      } else {
        // 일반 값 (숫자, 날짜, 수식 결과 등)
        const vMatch = cellBody.match(/<v\b[^>]*>([\s\S]*?)<\/v>/i);
        cellValue = vMatch ? decodeXmlEntities(vMatch[1].trim()) : "";
      }

      while (cells.length < colIndex) {
        cells.push("");
      }
      cells[colIndex] = cellValue.trim();
    }

    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * Microsoft XML Spreadsheet 2003 (<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet">) 파싱
 */
export function parseXmlSpreadsheet2003(xmlText: string): string[][] {
  const rows: string[][] = [];
  const rowRegex = /<Row\b[^>]*>([\s\S]*?)<\/Row>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(xmlText)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    const cellRegex = /<Cell\b([^>]*)>([\s\S]*?)<\/Cell>/gi;
    let cellMatch: RegExpExecArray | null;

    let currentCol = 0;
    while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
      const attrs = cellMatch[1];
      const cellBody = cellMatch[2];

      const indexMatch = attrs.match(/ss:Index="(\d+)"/i);
      if (indexMatch) {
        currentCol = parseInt(indexMatch[1], 10) - 1;
      }

      const dataMatch = cellBody.match(/<Data\b[^>]*>([\s\S]*?)<\/Data>/i);
      const cellValue = dataMatch ? decodeXmlEntities(dataMatch[1].trim()) : "";

      while (cells.length < currentCol) {
        cells.push("");
      }
      cells[currentCol] = cellValue;
      currentCol++;
    }

    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * HTML Table 기반 .xls 파일 파싱 (국내 다수 금융사의 웹 그리드 엑셀 다운로드 포맷)
 */
export function parseHtmlTableXls(htmlText: string): string[][] {
  const rows: string[][] = [];
  const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(htmlText)) !== null) {
    const trContent = trMatch[1];
    const cells: string[] = [];
    const tdRegex = /<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    let tdMatch: RegExpExecArray | null;

    while ((tdMatch = tdRegex.exec(trContent)) !== null) {
      // 태그 제거 및 엔티티 디코딩
      const rawText = tdMatch[1].replace(/<[^>]+>/g, "").trim();
      cells.push(decodeXmlEntities(rawText));
    }

    if (cells.some((c) => c.length > 0)) {
      rows.push(cells);
    }
  }

  return rows;
}

/**
 * 주요 8개 카드사(신한, 현대, 삼성, KB국민, 롯데, 우리, 하나, NH농협) 엑셀 헤더 패턴 정의
 */
export const EXCEL_MERCHANT_PATTERNS = [
  /(가맹점명|가맹점|이용가맹점|이용처|사용처|상호명|내역|가맹점\(사용처\)|가맹점정보|이용가맹점명|상호|매입가맹점|이용처\(가맹점명\))/i,
];

export const EXCEL_AMOUNT_PATTERNS = [
  /(이용금액\(원\)|이용금액|승인금액\(원\)|승인금액|결제금액|원금액|매출금액|금액|승인금액\(krw\)|이용금액\(krw\)|청구금액|국내이용금액|사용금액)/i,
];

export const EXCEL_STATUS_PATTERNS = [
  /(승인구분|처리상태|결제구분|매출구분|이용구분|거래구분|상태|구분|매입상태|승인상태|취소구분)/i,
];

export const EXCEL_CATEGORY_PATTERNS = [
  /(가맹점업종|업종명|업종|카테고리|분류|업종구분|가맹점구분)/i,
];

export interface ExcelHeaderMapping {
  headerIndex: number;
  merchantCol: number;
  amountCol: number;
  statusCol: number;
  categoryCol: number;
}

/**
 * 엑셀 행들 중 8대 카드사 명세서 헤더 행 및 열 인덱스 자동 감지
 * 고객명, 카드번호, 조회기간 등 상단 메타데이터 행 자동 건너뜀
 */
export function detectExcelHeaderMapping(rows: string[][]): ExcelHeaderMapping | null {
  for (let r = 0; r < Math.min(rows.length, 25); r++) {
    const row = rows[r];

    let merchantCol = -1;
    let amountCol = -1;
    let statusCol = -1;
    let categoryCol = -1;

    for (let c = 0; c < row.length; c++) {
      const colName = (row[c] || "").replace(/\s+/g, "");

      if (merchantCol === -1 && EXCEL_MERCHANT_PATTERNS.some((p) => p.test(colName))) {
        merchantCol = c;
      }
      if (amountCol === -1 && EXCEL_AMOUNT_PATTERNS.some((p) => p.test(colName))) {
        amountCol = c;
      }
      if (statusCol === -1 && EXCEL_STATUS_PATTERNS.some((p) => p.test(colName))) {
        statusCol = c;
      }
      if (categoryCol === -1 && EXCEL_CATEGORY_PATTERNS.some((p) => p.test(colName))) {
        categoryCol = c;
      }
    }

    if (merchantCol !== -1 && amountCol !== -1) {
      return {
        headerIndex: r,
        merchantCol,
        amountCol,
        statusCol,
        categoryCol,
      };
    }
  }

  return null;
}

/**
 * ArrayBuffer 바이너리를 받아 포맷 감지 후 2차원 행 데이터(string[][])로 변환
 */
export async function parseExcelBufferToRows(buffer: ArrayBuffer): Promise<string[][]> {
  const bytes = new Uint8Array(buffer);

  // 1. PKZIP 포맷 검사 (.xlsx OpenXML)
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x50 &&
    bytes[1] === 0x4b &&
    (bytes[2] === 0x03 || bytes[2] === 0x05) &&
    (bytes[3] === 0x04 || bytes[3] === 0x06)
  ) {
    const files = await parseZipEntries(buffer);
    const decoder = new TextDecoder("utf-8");

    // 공용 문자열 테이블 파싱
    let sharedStrings: string[] = [];
    for (const [name, content] of files.entries()) {
      if (name.endsWith("sharedStrings.xml")) {
        sharedStrings = parseSharedStringsXml(decoder.decode(content));
        break;
      }
    }

    // 워크시트 파일 탐색 (sheet1.xml 우선)
    let sheetContent: Uint8Array | undefined;
    for (const [name, content] of files.entries()) {
      if (name.includes("worksheets/sheet1.xml")) {
        sheetContent = content;
        break;
      }
    }
    if (!sheetContent) {
      for (const [name, content] of files.entries()) {
        if (name.includes("worksheets/sheet") && name.endsWith(".xml")) {
          sheetContent = content;
          break;
        }
      }
    }

    if (sheetContent) {
      return parseSheetXml(decoder.decode(sheetContent), sharedStrings);
    }
  }

  // 2. 텍스트 디코딩 (UTF-8 및 EUC-KR 감지)
  const decodedText = decodeCsvBuffer(buffer);
  const trimmed = decodedText.trimStart();

  // 3. XML Spreadsheet 2003 검사
  if (
    trimmed.startsWith("<?xml") ||
    trimmed.includes("<Workbook") ||
    trimmed.includes("urn:schemas-microsoft-com:office:spreadsheet")
  ) {
    const rows = parseXmlSpreadsheet2003(decodedText);
    if (rows.length > 0) return rows;
  }

  // 4. HTML Table 기반 .xls 검사
  if (
    trimmed.includes("<table") ||
    trimmed.includes("<html") ||
    trimmed.includes("<tr")
  ) {
    const rows = parseHtmlTableXls(decodedText);
    if (rows.length > 0) return rows;
  }

  // 5. 텍스트/CSV 포맷 폴백
  return parseCsvRows(decodedText);
}

/**
 * 2차원 행 데이터를 받아 카드사 지출 항목 목록(ParsedSpendingItem[])으로 정제
 */
export function processExcelRows(
  rows: string[][],
  customRules?: CustomMerchantRule[]
): ParsedSpendingItem[] {
  if (rows.length === 0) return [];

  const mapping = detectExcelHeaderMapping(rows);
  if (!mapping) {
    throw new Error(
      "엑셀 파일에서 '가맹점명'과 '이용금액' 컬럼 헤더를 찾을 수 없습니다. 카드사 명세서 양식을 확인해 주세요."
    );
  }

  const effectiveRules = customRules !== undefined ? customRules : getStoredMerchantRules();
  const { headerIndex, merchantCol, amountCol, statusCol, categoryCol } = mapping;
  const items: ParsedSpendingItem[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawMerchant = row[merchantCol] || "";
    const rawAmount = row[amountCol] || "";
    const rawStatus = statusCol !== -1 ? row[statusCol] || "" : "";
    const rawSector = categoryCol !== -1 ? row[categoryCol] || "" : "";

    const merchant = rawMerchant.trim().replace(/^['"]|['"]$/g, "");
    if (!merchant) continue;

    // 합계/소계/안내/총계 등 제외
    if (/(합계|소계|누계|총합계|소계금액|월간합계|총결제금액)/.test(merchant)) continue;

    const amount = parseAmountValue(rawAmount, rawStatus);
    if (amount === 0) continue;

    const category = inferCategory(merchant, rawSector, effectiveRules);

    items.push({
      merchant,
      amount,
      category,
    });
  }

  return items;
}

/**
 * 엑셀 파일(File 객체)을 읽고 지출 항목을 파싱하는 비동기 메인 함수
 */
export async function parseExcelFile(
  file: File,
  customRules?: CustomMerchantRule[]
): Promise<ParsedSpendingItem[]> {
  const validation = validateExcelFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const buffer = await file.arrayBuffer();
  const rows = await parseExcelBufferToRows(buffer);
  const items = processExcelRows(rows, customRules);

  if (items.length === 0) {
    throw new Error("엑셀 파일 내에서 유효한 결제 내역을 찾을 수 없습니다.");
  }

  return items;
}
