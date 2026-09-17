import { describe, it, expect } from "vitest";
import {
  decodeCsvBuffer,
  parseCsvRows,
  detectHeaderMapping,
  parseAmountValue,
  inferCategory,
  parseCsvContent,
  validateCsvFile,
  parseCsvFile,
} from "@/lib/csvSpendingParser";

describe("csvSpendingParser 유틸리티 테스트", () => {
  describe("validateCsvFile", () => {
    it("CSV 확장자 파일은 유효성 검사를 통과해야 한다", () => {
      const file = new File(["test"], "spending.csv", { type: "text/csv" });
      const result = validateCsvFile(file);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("5MB를 초과하는 대용량 파일은 유효성 에러를 반환해야 한다", () => {
      const bigBuffer = new Uint8Array(6 * 1024 * 1024);
      const file = new File([bigBuffer], "large.csv", { type: "text/csv" });
      const result = validateCsvFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("5MB 이하");
    });

    it("지원하지 않는 확장자(예: exe, pdf)는 거부해야 한다", () => {
      const file = new File(["test"], "statement.pdf", { type: "application/pdf" });
      const result = validateCsvFile(file);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("올바른 CSV 형식");
    });
  });

  describe("decodeCsvBuffer (UTF-8 & EUC-KR)", () => {
    it("UTF-8 문자열을 올바르게 디코딩해야 한다", () => {
      const text = "이용일자,가맹점명,이용금액\n2026-09-01,스타벅스 강남점,4500";
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text).buffer;

      const decoded = decodeCsvBuffer(buffer);
      expect(decoded).toContain("스타벅스 강남점");
    });

    it("UTF-8 BOM이 포함된 바이너리를 디코딩하고 BOM을 처리할 수 있어야 한다", () => {
      const text = "\uFEFF이용일자,가맹점명,이용금액\n2026-09-01,이마트,35000";
      const encoder = new TextEncoder();
      const buffer = encoder.encode(text).buffer;

      const decoded = decodeCsvBuffer(buffer);
      expect(decoded).toContain("이마트");
    });

    it("EUC-KR로 인코딩된 바이트도 정상적으로 텍스트로 복원해야 한다", () => {
      // "가맹점명"의 EUC-KR 바이트: 0xB0, 0xA1, 0xB8, 0xCD, 0xC1, 0xA1, 0xB8, 0xED
      const euckrBytes = new Uint8Array([
        0xb0, 0xa1, 0xb8, 0xcd, 0xc1, 0xa1, 0xb8, 0xed, 0x2c, // 가맹점명,
        0xc0, 0xcc, 0xbf, 0xeb, 0xb1, 0xdd, 0xbe, 0xd7, // 이용금액
      ]);
      const decoded = decodeCsvBuffer(euckrBytes.buffer);
      expect(decoded).toContain("가맹점명");
      expect(decoded).toContain("이용금액");
    });
  });

  describe("parseCsvRows (RFC 4180)", () => {
    it("기본 쉼표 구분 행을 파싱해야 한다", () => {
      const csv = "일자,가맹점,금액\n2026-09-01,GS25,1500\n2026-09-02,CU,2000";
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(3);
      expect(rows[1]).toEqual(["2026-09-01", "GS25", "1500"]);
      expect(rows[2]).toEqual(["2026-09-02", "CU", "2000"]);
    });

    it("따옴표 내 쉼표가 있는 경우 필드를 분리하지 않아야 한다", () => {
      const csv = '일자,가맹점,금액\n2026-09-01,"스타벅스, 역삼점",6000';
      const rows = parseCsvRows(csv);
      expect(rows[1][1]).toBe("스타벅스, 역삼점");
      expect(rows[1][2]).toBe("6000");
    });

    it("따옴표 내 쌍따옴표 이스케이프(\"\")를 파싱해야 한다", () => {
      const csv = '일자,가맹점,금액\n2026-09-01,"카페 ""블루보틀"" 압구정",7500';
      const rows = parseCsvRows(csv);
      expect(rows[1][1]).toBe('카페 "블루보틀" 압구정');
    });

    it("빈 줄은 무시되어야 한다", () => {
      const csv = "일자,가맹점,금액\n\n2026-09-01,GS25,1500\n\n";
      const rows = parseCsvRows(csv);
      expect(rows).toHaveLength(2);
    });
  });

  describe("detectHeaderMapping", () => {
    it("다양한 카드사 명세서 헤더를 자동 매핑해야 한다", () => {
      const shinhanRows = [
        ["조회기간: 2026-08-01 ~ 2026-08-31", ""],
        ["이용일자", "가맹점명", "이용금액", "승인구분", "업종"],
        ["2026-08-05", "스타벅스", "4500", "승인", "커피전문점"],
      ];
      const mapping = detectHeaderMapping(shinhanRows);
      expect(mapping).not.toBeNull();
      expect(mapping?.headerIndex).toBe(1);
      expect(mapping?.merchantCol).toBe(1);
      expect(mapping?.amountCol).toBe(2);
      expect(mapping?.statusCol).toBe(3);
      expect(mapping?.categoryCol).toBe(4);
    });

    it("현대카드 형태 헤더(이용처, 이용금액(원), 결제구분)를 매핑해야 한다", () => {
      const hyundaiRows = [
        ["승인일자", "이용처", "결제구분", "이용금액(원)"],
        ["2026-08-10", "쿠팡", "일시불", "32000"],
      ];
      const mapping = detectHeaderMapping(hyundaiRows);
      expect(mapping).not.toBeNull();
      expect(mapping?.merchantCol).toBe(1);
      expect(mapping?.statusCol).toBe(2);
      expect(mapping?.amountCol).toBe(3);
    });

    it("가맹점명이나 금액 컬럼이 없으면 null을 반환해야 한다", () => {
      const invalidRows = [
        ["일자", "회원명", "비고"],
        ["2026-08-01", "홍길동", "메모"],
      ];
      expect(detectHeaderMapping(invalidRows)).toBeNull();
    });
  });

  describe("parseAmountValue", () => {
    it("통화 기호 및 쉼표가 포함된 일반 금액을 숫자로 변환해야 한다", () => {
      expect(parseAmountValue("15,000원")).toBe(15000);
      expect(parseAmountValue("₩32,500")).toBe(32500);
      expect(parseAmountValue("4500")).toBe(4500);
    });

    it("음수 기호(-, ▲, 괄호)가 있는 경우 음수로 변환해야 한다", () => {
      expect(parseAmountValue("-12,000")).toBe(-12000);
      expect(parseAmountValue("▲5,500원")).toBe(-5500);
      expect(parseAmountValue("(25,000)")).toBe(-25000);
    });

    it("상태 컬럼에 취소/환불이 표기된 경우 양수 금액도 음수로 변환해야 한다", () => {
      expect(parseAmountValue("15,000원", "승인취소")).toBe(-15000);
      expect(parseAmountValue("8,000", "환불완료")).toBe(-8000);
      expect(parseAmountValue("24,000", "부분취소")).toBe(-24000);
    });
  });

  describe("inferCategory", () => {
    it("업종명을 바탕으로 카테고리를 자동 추론해야 한다", () => {
      expect(inferCategory("맛있는밥집", "일반음식점")).toBe("dining");
      expect(inferCategory("착한카페", "제과점")).toBe("cafe");
      expect(inferCategory("동네슈퍼", "슈퍼마켓")).toBe("mart");
      expect(inferCategory("우리동네주유소", "주유소")).toBe("gas");
      expect(inferCategory("서울시내버스", "대중교통")).toBe("transport");
    });

    it("가맹점명 키워드로 카테고리를 추론해야 한다", () => {
      expect(inferCategory("스타벅스 강남R점")).toBe("cafe");
      expect(inferCategory("GS25 역삼테헤란점")).toBe("convenience");
      expect(inferCategory("쿠팡 결제")).toBe("onlineShopping");
      expect(inferCategory("배달의민족")).toBe("dining");
      expect(inferCategory("넷플릭스 월정액")).toBe("culture");
    });

    it("매칭되는 키워드가 없으면 etc로 분류해야 한다", () => {
      expect(inferCategory("서울아산병원")).toBe("etc");
      expect(inferCategory("김앤장법률사무소")).toBe("etc");
    });
  });

  describe("parseCsvContent (종합 파싱)", () => {
    it("신한카드 형태의 CSV를 올바르게 파싱해야 한다", () => {
      const csv = `조회기간: 2026-08-01 ~ 2026-08-31
카드번호: 1234-****-****-5678
이용일자,가맹점명,이용금액,승인구분,업종
2026-08-01,스타벅스 강남점,4500,승인,커피전문점
2026-08-02,이마트 역삼점,45000,승인,대형할인점
2026-08-03,배달의민족,24000,승인,일반음식
2026-08-04,스타벅스 강남점,4500,승인취소,커피전문점
합계,,69000,,`;

      const result = parseCsvContent(csv);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({
        merchant: "스타벅스 강남점",
        amount: 4500,
        category: "cafe",
      });
      expect(result[1]).toEqual({
        merchant: "이마트 역삼점",
        amount: 45000,
        category: "mart",
      });
      expect(result[2]).toEqual({
        merchant: "배달의민족",
        amount: 24000,
        category: "dining",
      });
      // 취소 건은 음수로 변환
      expect(result[3]).toEqual({
        merchant: "스타벅스 강남점",
        amount: -4500,
        category: "cafe",
      });
    });

    it("KB국민카드 형태의 CSV를 올바르게 파싱해야 한다", () => {
      const csv = `이용일자,가맹점,이용금액(원),상태
2026-08-11,GS25 마포점,"3,200",정상
2026-08-12,카카오T택시,"12,800",정상
2026-08-13,쿠팡,"-19,800",취소`;

      const result = parseCsvContent(csv);
      expect(result).toHaveLength(3);
      expect(result[0].category).toBe("convenience");
      expect(result[1].category).toBe("transport");
      expect(result[2].amount).toBe(-19800);
      expect(result[2].category).toBe("onlineShopping");
    });

    it("헤더를 찾을 수 없는 CSV는 명확한 에러를 던져야 한다", () => {
      const csv = "이름,주소,전화번호\n홍길동,서울시,010-1234-5678";
      expect(() => parseCsvContent(csv)).toThrow("CSV 파일에서 '가맹점명'과 '이용금액' 컬럼 헤더를 찾을 수 없습니다.");
    });
  });

  describe("parseCsvFile", () => {
    it("정상 CSV 파일을 파싱하여 배열을 반환해야 한다", async () => {
      const csv = "이용일자,가맹점명,이용금액\n2026-09-01,스타벅스,5000\n2026-09-02,CU,1500";
      const file = new File([csv], "history.csv", { type: "text/csv" });
      const items = await parseCsvFile(file);
      expect(items).toHaveLength(2);
      expect(items[0].merchant).toBe("스타벅스");
      expect(items[0].amount).toBe(5000);
      expect(items[1].merchant).toBe("CU");
      expect(items[1].amount).toBe(1500);
    });
  });
});
