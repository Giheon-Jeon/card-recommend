import { describe, it, expect, beforeEach } from "vitest";
import { inferCategory, parseCsvContent } from "@/lib/csvSpendingParser";
import { parseTextLocally } from "@/lib/importerParser";
import {
  saveStoredMerchantRules,
  type CustomMerchantRule,
} from "@/lib/merchantRules";

describe("파서 및 커스텀 가맹점 규칙 우선순위 병합 테스트", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const customRules: CustomMerchantRule[] = [
    { id: "1", keyword: "스타벅스", category: "dining", createdAt: 1 }, // 원래 cafe이나 사용자가 dining으로 커스텀
    { id: "2", keyword: "행복마트", category: "mart", createdAt: 2 }, // 원래 사전에 없던 상점
    { id: "3", keyword: "동네카페", category: "cafe", createdAt: 3 },
  ];

  describe("csvSpendingParser - inferCategory 커스텀 룰 우선 매칭", () => {
    it("기본 사전상 cafe인 스타벅스가 커스텀 룰에 의해 dining으로 분류되어야 한다", () => {
      const category = inferCategory("스타벅스 강남점", undefined, customRules);
      expect(category).toBe("dining");
    });

    it("기본 사전에 없는 가맹점도 커스텀 룰에 의해 올바르게 분류되어야 한다", () => {
      const category = inferCategory("행복마트 본점", undefined, customRules);
      expect(category).toBe("mart");
    });

    it("커스텀 룰에 해당하지 않는 가맹점은 기존 기본 사전 규칙을 따라야 한다", () => {
      const category = inferCategory("GS25 역삼점", undefined, customRules);
      expect(category).toBe("convenience");
    });
  });

  describe("csvSpendingParser - parseCsvContent 커스텀 룰 연동", () => {
    it("CSV 파싱 시 커스텀 룰을 반영하여 항목들의 카테고리를 추론해야 한다", () => {
      const sampleCsv = `이용일자,이용가맹점명,이용금액(원),승인상태
2026-10-15,스타벅스 서초점,5500,정상승인
2026-10-15,행복마트 역삼점,32000,정상승인
2026-10-16,GS25 편의점,4000,정상승인`;

      const items = parseCsvContent(sampleCsv, customRules);
      expect(items.length).toBe(3);

      expect(items[0].merchant).toBe("스타벅스 서초점");
      expect(items[0].category).toBe("dining"); // 커스텀 룰 우선

      expect(items[1].merchant).toBe("행복마트 역삼점");
      expect(items[1].category).toBe("mart"); // 커스텀 룰 우선

      expect(items[2].merchant).toBe("GS25 편의점");
      expect(items[2].category).toBe("convenience"); // 기본 사전
    });

    it("인자로 customRules를 넘기지 않아도 localStorage에 저장된 룰을 자동으로 반영해야 한다", () => {
      saveStoredMerchantRules(customRules);

      const sampleCsv = `가맹점,금액
스타벅스 서초점,5500
행복마트 본점,12000`;

      const items = parseCsvContent(sampleCsv);
      expect(items[0].category).toBe("dining");
      expect(items[1].category).toBe("mart");
    });
  });

  describe("importerParser - parseTextLocally 커스텀 룰 연동", () => {
    it("텍스트 결제 내역 파싱 시 커스텀 룰이 최우선으로 매칭되어야 한다", () => {
      const sampleText = `[Web발신]
신한체크승인 전기헌님
10/16 14:20 5,500원 스타벅스
10/16 15:30 12,000원 행복마트`;

      const items = parseTextLocally(sampleText, customRules);
      expect(items.length).toBe(2);

      expect(items[0].category).toBe("dining"); // 스타벅스 -> dining
      expect(items[1].category).toBe("mart"); // 행복마트 -> mart
    });
  });
});
