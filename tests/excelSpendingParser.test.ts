import { describe, it, expect } from "vitest";
import {
  validateExcelFile,
  columnNameToIndex,
  extractColName,
  decodeXmlEntities,
  parseXmlSpreadsheet2003,
  parseHtmlTableXls,
  parseSharedStringsXml,
  parseSheetXml,
  detectExcelHeaderMapping,
  processExcelRows,
  parseExcelFile,
  parseExcelBufferToRows,
  MAX_EXCEL_FILE_SIZE,
} from "@/lib/excelSpendingParser";
import type { CustomMerchantRule } from "@/lib/merchantRules";

describe("excelSpendingParser", () => {
  describe("validateExcelFile", () => {
    it("정상 .xlsx 및 .xls 파일은 유효성 검사를 통과해야 한다", () => {
      const xlsxFile = new File(["dummy"], "statement.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const xlsFile = new File(["dummy"], "statement.xls", {
        type: "application/vnd.ms-excel",
      });

      expect(validateExcelFile(xlsxFile).isValid).toBe(true);
      expect(validateExcelFile(xlsFile).isValid).toBe(true);
    });

    it("10MB를 초과하는 대용량 엑셀 파일은 에러를 반환해야 한다", () => {
      const largeFile = new File(["dummy"], "big.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      Object.defineProperty(largeFile, "size", { value: MAX_EXCEL_FILE_SIZE + 1024 });

      const result = validateExcelFile(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("10MB 이하");
    });

    it("엑셀이 아닌 파일 확장자는 거부해야 한다", () => {
      const pdfFile = new File(["dummy"], "statement.pdf", { type: "application/pdf" });
      const result = validateExcelFile(pdfFile);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("올바른 엑셀 형식");
    });
  });

  describe("유틸리티 함수", () => {
    it("columnNameToIndex는 엑셀 열 문자를 0-based 인덱스로 정확히 변환해야 한다", () => {
      expect(columnNameToIndex("A")).toBe(0);
      expect(columnNameToIndex("B")).toBe(1);
      expect(columnNameToIndex("Z")).toBe(25);
      expect(columnNameToIndex("AA")).toBe(26);
      expect(columnNameToIndex("AB")).toBe(27);
    });

    it("extractColName은 셀 좌표에서 열 문자를 추출해야 한다", () => {
      expect(extractColName("A1")).toBe("A");
      expect(extractColName("BC105")).toBe("BC");
      expect(extractColName("invalid")).toBe("invalid");
    });

    it("decodeXmlEntities는 특수문자 및 엔티티를 정상 디코딩해야 한다", () => {
      expect(decodeXmlEntities("스타벅스 &amp; 커피")).toBe("스타벅스 & 커피");
      expect(decodeXmlEntities("&lt;식당&gt;")).toBe("<식당>");
      expect(decodeXmlEntities("&quot;파리바게뜨&quot;")).toBe('"파리바게뜨"');
      expect(decodeXmlEntities("GS25&#39;s")).toBe("GS25's");
      expect(decodeXmlEntities("이마트&nbsp;역삼점")).toBe("이마트 역삼점");
    });
  });

  describe("XML Spreadsheet 2003 파싱 (parseXmlSpreadsheet2003)", () => {
    it("국민카드/현대카드 스타일의 XML 스프레드시트 2003 포맷을 행 배열로 파싱해야 한다", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="Sheet1">
    <Table>
      <Row>
        <Cell><Data ss:Type="String">고객명: 홍길동</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">이용일자</Data></Cell>
        <Cell><Data ss:Type="String">가맹점명</Data></Cell>
        <Cell><Data ss:Type="String">이용금액(원)</Data></Cell>
        <Cell><Data ss:Type="String">승인상태</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">2026-08-01</Data></Cell>
        <Cell><Data ss:Type="String">스타벅스 강남점</Data></Cell>
        <Cell><Data ss:Type="Number">5500</Data></Cell>
        <Cell><Data ss:Type="String">정상</Data></Cell>
      </Row>
      <Row>
        <Cell><Data ss:Type="String">2026-08-02</Data></Cell>
        <Cell><Data ss:Type="String">스타벅스 강남점</Data></Cell>
        <Cell><Data ss:Type="Number">5500</Data></Cell>
        <Cell><Data ss:Type="String">승인취소</Data></Cell>
      </Row>
    </Table>
  </Worksheet>
</Workbook>`;

      const rows = parseXmlSpreadsheet2003(xml);
      expect(rows.length).toBe(4);
      expect(rows[1]).toEqual(["이용일자", "가맹점명", "이용금액(원)", "승인상태"]);
      expect(rows[2]).toEqual(["2026-08-01", "스타벅스 강남점", "5500", "정상"]);

      const items = processExcelRows(rows);
      expect(items.length).toBe(2);
      expect(items[0]).toEqual({
        merchant: "스타벅스 강남점",
        amount: 5500,
        category: "cafe",
      });
      // 취소 건은 음수로 변환
      expect(items[1]).toEqual({
        merchant: "스타벅스 강남점",
        amount: -5500,
        category: "cafe",
      });
    });
  });

  describe("HTML Table 포맷 .xls 파싱 (parseHtmlTableXls)", () => {
    it("신한카드/삼성카드 등 웹 다운로드 HTML table 포맷을 행 배열로 파싱해야 한다", () => {
      const html = `
      <html>
        <body>
          <table>
            <tr><th colspan="4">신한카드 월별 이용명세서</th></tr>
            <tr>
              <th>이용일시</th>
              <th>가맹점명(사용처)</th>
              <th>승인금액</th>
              <th>가맹점업종</th>
            </tr>
            <tr>
              <td>2026.08.10 12:30</td>
              <td>배달의민족</td>
              <td>24,000</td>
              <td>일반음식</td>
            </tr>
            <tr>
              <td>2026.08.11 08:45</td>
              <td>GS25 강남역점</td>
              <td>4,500</td>
              <td>편의점</td>
            </tr>
            <tr>
              <td colspan="2">합계</td>
              <td>28,500</td>
              <td></td>
            </tr>
          </table>
        </body>
      </html>`;

      const rows = parseHtmlTableXls(html);
      expect(rows.length).toBe(5);

      const items = processExcelRows(rows);
      expect(items.length).toBe(2);
      expect(items[0]).toEqual({
        merchant: "배달의민족",
        amount: 24000,
        category: "dining",
      });
      expect(items[1]).toEqual({
        merchant: "GS25 강남역점",
        amount: 4500,
        category: "convenience",
      });
    });
  });

  describe("OpenXML Sheet 및 SharedStrings 파싱", () => {
    it("sharedStrings.xml과 sheet1.xml 구조를 행으로 결합해야 한다", () => {
      const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <si><t>가맹점명</t></si>
  <si><t>이용금액</t></si>
  <si><t>카카오T택시</t></si>
  <si><t>이마트 역삼점</t></si>
</sst>`;

      const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c r="A1" t="s"><v>0</v></c>
      <c r="B1" t="s"><v>1</v></c>
    </row>
    <row r="2">
      <c r="A2" t="s"><v>2</v></c>
      <c r="B2"><v>12800</v></c>
    </row>
    <row r="3">
      <c r="A3" t="s"><v>3</v></c>
      <c r="B3"><v>45000</v></c>
    </row>
  </sheetData>
</worksheet>`;

      const sharedStrings = parseSharedStringsXml(sharedStringsXml);
      expect(sharedStrings).toEqual(["가맹점명", "이용금액", "카카오T택시", "이마트 역삼점"]);

      const rows = parseSheetXml(sheetXml, sharedStrings);
      expect(rows.length).toBe(3);
      expect(rows[0]).toEqual(["가맹점명", "이용금액"]);
      expect(rows[1]).toEqual(["카카오T택시", "12800"]);
      expect(rows[2]).toEqual(["이마트 역삼점", "45000"]);

      const items = processExcelRows(rows);
      expect(items.length).toBe(2);
      expect(items[0]).toEqual({ merchant: "카카오T택시", amount: 12800, category: "transport" });
      expect(items[1]).toEqual({ merchant: "이마트 역삼점", amount: 45000, category: "mart" });
    });
  });

  describe("detectExcelHeaderMapping 및 parseExcelBufferToRows", () => {
    it("detectExcelHeaderMapping은 다양한 명세서 헤더 인덱스를 정확히 감지해야 한다", () => {
      const rows = [
        ["고객명: 홍길동"],
        ["카드구분: 개인 신용"],
        ["이용일시", "가맹점명", "이용금액", "상태", "업종"],
      ];
      const mapping = detectExcelHeaderMapping(rows);
      expect(mapping).not.toBeNull();
      expect(mapping?.headerIndex).toBe(2);
      expect(mapping?.merchantCol).toBe(1);
      expect(mapping?.amountCol).toBe(2);
      expect(mapping?.statusCol).toBe(3);
      expect(mapping?.categoryCol).toBe(4);
    });

    it("parseExcelBufferToRows는 텍스트/HTML 버퍼를 2차원 행으로 역직렬화해야 한다", async () => {
      const htmlText = "<table><tr><th>가맹점명</th><th>이용금액</th></tr><tr><td>테스트마트</td><td>15000</td></tr></table>";
      const encoder = new TextEncoder();
      const buffer = encoder.encode(htmlText).buffer;
      const rows = await parseExcelBufferToRows(buffer);
      expect(rows.length).toBe(2);
      expect(rows[1]).toEqual(["테스트마트", "15000"]);
    });
  });

  describe("주요 8개 카드사 양식 헤더 자동 감지 및 변환", () => {
    it("1. 신한카드 (이용일자, 가맹점명, 이용금액(원), 승인상태)", () => {
      const rows = [
        ["조회기간 : 2026-08-01 ~ 2026-08-31", "", "", ""],
        ["이용일자", "가맹점명", "이용금액(원)", "승인상태"],
        ["2026.08.05", "쿠팡 결제", "34,900", "승인"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "쿠팡 결제", amount: 34900, category: "onlineShopping" });
    });

    it("2. 현대카드 (거래일자, 이용가맹점, 청구금액, 상태)", () => {
      const rows = [
        ["거래일자", "이용가맹점", "청구금액", "상태"],
        ["2026/08/12", "CGV 영화관", "15,000", "정상"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "CGV 영화관", amount: 15000, category: "culture" });
    });

    it("3. 삼성카드 (승인일시, 가맹점, 결제금액, 업종)", () => {
      const rows = [
        ["카드번호: 1234-****-****", "", "", ""],
        ["승인일시", "가맹점", "결제금액", "업종"],
        ["2026-08-15 13:00", "GS칼텍스 주유소", "50,000", "주유소"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "GS칼텍스 주유소", amount: 50000, category: "gas" });
    });

    it("4. KB국민카드 (이용일시, 이용처, 이용금액, 이용구분)", () => {
      const rows = [
        ["이용일시", "이용처", "이용금액", "이용구분"],
        ["2026.08.18", "투썸플레이스", "12,000", "매출"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "투썸플레이스", amount: 12000, category: "cafe" });
    });

    it("5. 롯데카드 (매출일자, 상호명, 매출금액, 처리상태)", () => {
      const rows = [
        ["매출일자", "상호명", "매출금액", "처리상태"],
        ["2026-08-20", "올리브영 명동점", "28,000", "정상매출"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "올리브영 명동점", amount: 28000, category: "etc" });
    });

    it("6. 우리카드 (거래일시, 가맹점(사용처), 승인금액(원), 구분)", () => {
      const rows = [
        ["거래일시", "가맹점(사용처)", "승인금액(원)", "구분"],
        ["2026.08.22", "지하철 대중교통", "55,000", "정상"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "지하철 대중교통", amount: 55000, category: "transport" });
    });

    it("7. 하나카드 (이용일자, 가맹점정보, 국내이용금액, 매입상태)", () => {
      const rows = [
        ["이용일자", "가맹점정보", "국내이용금액", "매입상태"],
        ["2026-08-23", "SKT 통신요금", "65,000", "매입완료"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "SKT 통신요금", amount: 65000, category: "mobile" });
    });

    it("8. NH농협카드 (승인일자, 매입가맹점, 원금액, 취소구분)", () => {
      const rows = [
        ["승인일자", "매입가맹점", "원금액", "취소구분"],
        ["2026-08-24", "농협하나로마트", "82,000", "정상"],
      ];
      const items = processExcelRows(rows);
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ merchant: "농협하나로마트", amount: 82000, category: "mart" });
    });
  });

  describe("커스텀 가맹점 룰 연동", () => {
    it("사용자 지정 커스텀 룰이 기본 키워드 사전보다 최우선 적용되어야 한다", () => {
      const rows = [
        ["가맹점명", "이용금액"],
        ["스타벅스 강남점", "10000"],
      ];
      const customRules: CustomMerchantRule[] = [
        {
          id: "rule-1",
          keyword: "스타벅스",
          category: "dining",
          priority: 1,
          createdAt: Date.now(),
        },
      ];

      const items = processExcelRows(rows, customRules);
      expect(items[0].category).toBe("dining"); // 원래 cafe이나 커스텀 룰에 의해 dining으로 분류
    });
  });

  describe("에러 처리", () => {
    it("헤더 행을 찾을 수 없는 경우 명확한 에러를 발생시켜야 한다", () => {
      const rows = [
        ["메모", "비고"],
        ["내용1", "내용2"],
      ];
      expect(() => processExcelRows(rows)).toThrow("컬럼 헤더를 찾을 수 없습니다");
    });

    it("빈 행 데이터인 경우 빈 배열을 반환해야 한다", () => {
      expect(processExcelRows([])).toEqual([]);
    });

    it("유효한 결제 건수가 0건인 파일은 에러를 발생시켜야 한다", async () => {
      const emptyHtml = `<html><body><table><tr><th>가맹점명</th><th>이용금액</th></tr></table></body></html>`;
      const file = new File([emptyHtml], "empty.xls", { type: "application/vnd.ms-excel" });
      await expect(parseExcelFile(file)).rejects.toThrow("유효한 결제 내역을 찾을 수 없습니다");
    });
  });

  describe("parseExcelFile 파일 파싱 통합", () => {
    it("HTML table 기반 .xls File 객체를 성공적으로 파싱해야 한다", async () => {
      const htmlContent = `
        <table>
          <tr><th>가맹점명</th><th>이용금액</th></tr>
          <tr><td>배달의민족</td><td>24,000</td></tr>
          <tr><td>스타벅스</td><td>-5,000</td></tr>
        </table>
      `;
      const file = new File([htmlContent], "card_statement.xls", {
        type: "application/vnd.ms-excel",
      });

      const items = await parseExcelFile(file);
      expect(items).toHaveLength(2);
      expect(items[0]).toEqual({ merchant: "배달의민족", amount: 24000, category: "dining" });
      expect(items[1]).toEqual({ merchant: "스타벅스", amount: -5000, category: "cafe" });
    });
  });
});
