import { KEYWORD_MAP, type ParsedSpendingItem } from "@/lib/importerParser";

/**
 * 업로드 허용 최대 CSV 파일 크기 (5MB) 및 지원 파일 형식 정의
 */
export const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface CsvValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * 업로드된 CSV 파일의 기본 크기 및 확장자 유효성 검증
 */
export function validateCsvFile(file: File): CsvValidationResult {
  if (file.size > MAX_CSV_FILE_SIZE) {
    return {
      isValid: false,
      error: "CSV 파일 크기는 최대 5MB 이하만 업로드 가능합니다.",
    };
  }

  const fileName = file.name.toLowerCase();
  const fileExt = fileName.substring(fileName.lastIndexOf("."));
  const isCsvExt = fileExt === ".csv" || fileExt === ".txt";
  const isCsvMime = !file.type || file.type.includes("csv") || file.type.includes("text") || file.type === "application/vnd.ms-excel";

  if (!isCsvExt && !isCsvMime) {
    return {
      isValid: false,
      error: "올바른 CSV 형식의 파일(.csv)을 선택해 주세요.",
    };
  }

  return { isValid: true };
}

/**
 * 브라우저 환경에서 ArrayBuffer 바이너리 데이터를 UTF-8 또는 EUC-KR/CP949로 자동 감지하여 디코딩
 * 한국 카드사(신한, 현대, 삼성, KB국민 등)에서 제공하는 명세서 CSV의 다수가 EUC-KR로 인코딩되어 배포됨
 */
export function decodeCsvBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);

  // UTF-8 BOM(EF BB BF) 확인
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    const utf8Decoder = new TextDecoder("utf-8");
    return utf8Decoder.decode(bytes.subarray(3));
  }

  // 1단계: fatal: true 옵션으로 UTF-8 디코딩 시도
  try {
    const strictUtf8Decoder = new TextDecoder("utf-8", { fatal: true });
    return strictUtf8Decoder.decode(bytes);
  } catch {
    // UTF-8 바이트 시퀀스가 깨질 경우 EUC-KR / CP949로 안전하게 폴백
    try {
      const euckrDecoder = new TextDecoder("euc-kr");
      return euckrDecoder.decode(bytes);
    } catch {
      // 만약 환경상 euc-kr을 지원하지 않는 극단적인 경우 기본 디코더 사용
      const fallbackDecoder = new TextDecoder();
      return fallbackDecoder.decode(bytes);
    }
  }
}

/**
 * RFC 4180 호환 CSV 문자열 파서
 * - 쌍따옴표 내 쉼표, 개행 문자("\r\n", "\n") 및 쌍따옴표 이스케이프("") 처리
 */
export function parseCsvRows(csvText: string): string[][] {
  const cleanText = csvText.replace(/^\uFEFF/, ""); // UTF-8 BOM 제거
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let insideQuote = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuote) {
      if (char === '"') {
        if (nextChar === '"') {
          // 이스케이프된 쌍따옴표 ("")
          currentField += '"';
          i++;
        } else {
          // 따옴표 닫힘
          insideQuote = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuote = true;
      } else if (char === ",") {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") {
          i++;
        }
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  // 마지막 필드 및 행 처리
  currentRow.push(currentField.trim());
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

/**
 * 카드사별 헤더 패턴 정의
 */
const MERCHANT_HEADER_PATTERNS = [
  /(가맹점명|가맹점|이용가맹점|이용처|사용처|상호명|내역|가맹점\(사용처\)|가맹점정보)/i,
];

const AMOUNT_HEADER_PATTERNS = [
  /(이용금액\(원\)|이용금액|승인금액\(원\)|승인금액|결제금액|원금액|매출금액|금액)/i,
];

const STATUS_HEADER_PATTERNS = [
  /(승인구분|처리상태|결제구분|매출구분|이용구분|거래구분|상태|구분)/i,
];

const CATEGORY_HEADER_PATTERNS = [
  /(가맹점업종|업종명|업종|카테고리|분류)/i,
];

export interface HeaderMapping {
  headerIndex: number;
  merchantCol: number;
  amountCol: number;
  statusCol: number;
  categoryCol: number;
}

/**
 * CSV 행들 중 카드사 명세서의 헤더 행을 탐지하고 컬럼 인덱스를 자동 매핑
 * 상단에 '조회기간:', '고객명:' 등 메타데이터 행이 있는 경우도 자동 탐지하여 헤더 추출
 */
export function detectHeaderMapping(rows: string[][]): HeaderMapping | null {
  for (let r = 0; r < Math.min(rows.length, 15); r++) {
    const row = rows[r];

    let merchantCol = -1;
    let amountCol = -1;
    let statusCol = -1;
    let categoryCol = -1;

    for (let c = 0; c < row.length; c++) {
      const colName = row[c].replace(/\s+/g, "");

      if (merchantCol === -1 && MERCHANT_HEADER_PATTERNS.some((p) => p.test(colName))) {
        merchantCol = c;
      }
      if (amountCol === -1 && AMOUNT_HEADER_PATTERNS.some((p) => p.test(colName))) {
        amountCol = c;
      }
      if (statusCol === -1 && STATUS_HEADER_PATTERNS.some((p) => p.test(colName))) {
        statusCol = c;
      }
      if (categoryCol === -1 && CATEGORY_HEADER_PATTERNS.some((p) => p.test(colName))) {
        categoryCol = c;
      }
    }

    // 핵심 컬럼인 가맹점명과 금액 컬럼이 모두 존재하면 유효한 헤더 행으로 확정
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
 * 문자열에서 금액 숫자 추출 및 환불/취소 음수 여부 판별
 */
export function parseAmountValue(rawVal: string, rawStatus?: string): number {
  if (!rawVal) return 0;

  const trimmedVal = rawVal.trim();
  const trimmedStatus = (rawStatus || "").trim();

  // 음수 표시 판별: -, ▲, 또는 괄호 (12,000)
  const isNegativeExplicit =
    trimmedVal.startsWith("-") ||
    trimmedVal.startsWith("▲") ||
    (trimmedVal.startsWith("(") && trimmedVal.endsWith(")"));

  // 상태 컬럼에서 환불/취소 키워드 검출
  const isRefundStatus = /(?:취소|환불|승인취소|부분취소|매출취소)/i.test(trimmedStatus);

  // 숫자 및 소수점, 음수부호 외 문자 제거
  const cleanedNumStr = trimmedVal.replace(/[^\d.-]/g, "");
  const absNum = Math.abs(parseFloat(cleanedNumStr));

  if (isNaN(absNum) || absNum === 0) return 0;

  const isNegative = isNegativeExplicit || isRefundStatus;
  return isNegative ? -absNum : absNum;
}

/**
 * 업종 키워드 및 브랜드 매핑
 */
const SECTOR_CATEGORY_MAP: Record<string, string> = {
  // 외식
  일반음식: "dining",
  서양음식: "dining",
  일식: "dining",
  중식: "dining",
  한식: "dining",
  음식점: "dining",
  식당: "dining",
  패스트푸드: "dining",
  제과점: "cafe",
  커피: "cafe",
  카페: "cafe",
  // 마트 / 편의점
  슈퍼마켓: "mart",
  대형할인점: "mart",
  마트: "mart",
  편의점: "convenience",
  // 교통
  대중교통: "transport",
  시내버스: "transport",
  시외버스: "transport",
  고속버스: "transport",
  지하철: "transport",
  철도: "transport",
  택시: "transport",
  // 주유
  주유소: "gas",
  충전소: "gas",
  LPG: "gas",
  // 통신
  통신: "mobile",
  이동통신: "mobile",
  // 문화
  영화: "culture",
  공연: "culture",
  극장: "culture",
  // 쇼핑
  전자상거래: "onlineShopping",
  인터넷쇼핑: "onlineShopping",
  통신판매: "onlineShopping",
};

/**
 * 가맹점명 및 업종명을 바탕으로 카테고리 자동 추론
 */
export function inferCategory(merchant: string, sector?: string): string {
  const targetText = `${merchant} ${sector || ""}`.toLowerCase();

  // 1) 업종명 기반 1차 매칭
  if (sector) {
    const sectorClean = sector.replace(/\s+/g, "");
    for (const [kw, cat] of Object.entries(SECTOR_CATEGORY_MAP)) {
      if (sectorClean.includes(kw)) {
        return cat;
      }
    }
  }

  // 2) 가맹점명 및 업종명을 기존 KEYWORD_MAP과 대조
  for (const [category, keywords] of Object.entries(KEYWORD_MAP)) {
    for (const kw of keywords) {
      if (targetText.includes(kw.toLowerCase())) {
        return category;
      }
    }
  }

  return "etc";
}

/**
 * CSV 전체 파싱 메인 함수
 * CSV 문자열을 받아 카드사별 규격 자동 인식 후 ParsedSpendingItem 목록 반환
 */
export function parseCsvContent(csvText: string): ParsedSpendingItem[] {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return [];

  const mapping = detectHeaderMapping(rows);
  if (!mapping) {
    throw new Error(
      "CSV 파일에서 '가맹점명'과 '이용금액' 컬럼 헤더를 찾을 수 없습니다. 카드사 명세서 파일 형식을 확인해 주세요."
    );
  }

  const { headerIndex, merchantCol, amountCol, statusCol, categoryCol } = mapping;
  const items: ParsedSpendingItem[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawMerchant = row[merchantCol] || "";
    const rawAmount = row[amountCol] || "";
    const rawStatus = statusCol !== -1 ? row[statusCol] || "" : "";
    const rawSector = categoryCol !== -1 ? row[categoryCol] || "" : "";

    // 가맹점명 정제
    const merchant = rawMerchant.trim().replace(/^['"]|['"]$/g, "");
    if (!merchant) continue;

    // 합계/소계/이용안내 등의 요약 행 제외
    if (/(합계|소계|누계|총합계|소계금액)/.test(merchant)) continue;

    // 금액 파싱
    const amount = parseAmountValue(rawAmount, rawStatus);
    if (amount === 0) continue; // 금액이 0원인 건 제외

    // 카테고리 자동 추론
    const category = inferCategory(merchant, rawSector);

    items.push({
      merchant,
      amount,
      category,
    });
  }

  return items;
}

/**
 * 브라우저 File 객체를 읽고 파싱하는 비동기 래퍼 함수
 */
export async function parseCsvFile(file: File): Promise<ParsedSpendingItem[]> {
  const validation = validateCsvFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  const buffer = await file.arrayBuffer();
  const decodedText = decodeCsvBuffer(buffer);
  const items = parseCsvContent(decodedText);

  if (items.length === 0) {
    throw new Error("CSV 파일 내에서 유효한 결제 내역을 찾을 수 없습니다.");
  }

  return items;
}
