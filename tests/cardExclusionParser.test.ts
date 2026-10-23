import { describe, it, expect } from "vitest";
import {
  parseCardExclusions,
  getExclusionsForCatalogEntry,
  getExclusionsForCard,
  getCategoryExclusionNotice,
  STANDARD_EXCLUSIONS,
} from "@/lib/cardExclusionParser";
import type { CatalogEntry } from "@/types/catalog";
import type { Card } from "@/types/card";

describe("cardExclusionParser", () => {
  describe("parseCardExclusions", () => {
    it("국세, 아파트관리비, 상품권 키워드가 포함되면 해당하는 제외 항목을 감지해야 한다", () => {
      const summary = "공과금 10% 할인 (단, 국세, 지방세, 아파트관리비, 상품권 구매는 전월실적 산정 제외)";
      const result = parseCardExclusions(summary);

      expect(result.detectedExclusions.map((e) => e.id)).toContain("tax");
      expect(result.detectedExclusions.map((e) => e.id)).toContain("apartment");
      expect(result.detectedExclusions.map((e) => e.id)).toContain("voucher");
      expect(result.hasHighRiskExclusions).toBe(true);
      expect(result.summaryNotice).toContain("세금·공과금");
    });

    it("4대보험, 초중고 납입금, 대학등록금, 무이자할부 키워드를 감지해야 한다", () => {
      const summary = "무이자할부 이용금액, 4대보험, 초중고 납입금 및 대학등록금은 실적 제외";
      const result = parseCardExclusions(summary);

      const detectedIds = result.detectedExclusions.map((e) => e.id);
      expect(detectedIds).toContain("insurance");
      expect(detectedIds).toContain("tuition");
      expect(detectedIds).toContain("interestFree");
    });

    it("키워드가 없는 일반 텍스트의 경우 detectedExclusions는 빈 배열이지만 allExclusions에 표준 3종이 포함되어야 한다", () => {
      const result = parseCardExclusions("스타벅스 10% 할인, 편의점 5% 할인");

      expect(result.detectedExclusions).toHaveLength(0);
      expect(result.standardExclusions).toHaveLength(STANDARD_EXCLUSIONS.length);
      expect(result.allExclusions.map((e) => e.id)).toEqual(
        expect.arrayContaining(["tax", "apartment", "voucher"])
      );
      expect(result.summaryNotice).toContain("국세, 지방세, 아파트관리비, 상품권");
    });

    it("benefitSummary, performanceStandard, notes가 함께 제공되면 결합하여 파싱한다", () => {
      const result = parseCardExclusions(
        "커피 10% 할인",
        "전월 30만원 이상 (상품권 제외)",
        "아파트 관리비 및 세금 실적 제외"
      );

      const detectedIds = result.detectedExclusions.map((e) => e.id);
      expect(detectedIds).toContain("voucher");
      expect(detectedIds).toContain("apartment");
      expect(detectedIds).toContain("tax");
    });

    it("대소문자 무관하게 키워드를 감지해야 한다", () => {
      const result = parseCardExclusions("대중교통 제외 혜택");
      expect(result.detectedExclusions.map((e) => e.id)).toContain("publicTransit");
    });
  });

  describe("getExclusionsForCatalogEntry", () => {
    it("CatalogEntry 객체의 benefitSummary와 performanceStandard를 파싱해야 한다", () => {
      const entry: CatalogEntry = {
        sourceId: 999,
        sourceUrl: "https://example.com/card/999",
        name: "테스트 카드",
        issuer: "테스트카드사",
        category: "신용",
        benefitSummary: "도시가스 10% 할인, 상품권 충전 제외",
        performanceStandard: "전월 40만원 이상 (아파트관리비 제외)",
        fetchedAt: "2026-03-01",
      };

      const result = getExclusionsForCatalogEntry(entry);
      const detectedIds = result.detectedExclusions.map((e) => e.id);
      expect(detectedIds).toContain("tax"); // 도시가스
      expect(detectedIds).toContain("voucher"); // 상품권
      expect(detectedIds).toContain("apartment"); // 아파트관리비
    });
  });

  describe("getExclusionsForCard", () => {
    it("Card 객체의 혜택 설명과 notes를 파싱해야 한다", () => {
      const card: Card = {
        id: "card-1",
        name: "모의 카드",
        issuer: "신한",
        cardType: "credit",
        annualFee: 10000,
        notes: "4대보험 및 무이자할부 실적 제외",
        tiers: [
          {
            minSpend: 300000,
            benefits: [
              {
                category: "etc",
                type: "discount",
                rate: 0.01,
                description: "선불카드 충전 제외",
              },
            ],
          },
        ],
      };

      const result = getExclusionsForCard(card);
      const detectedIds = result.detectedExclusions.map((e) => e.id);
      expect(detectedIds).toContain("insurance");
      expect(detectedIds).toContain("interestFree");
      expect(detectedIds).toContain("voucher");
    });
  });

  describe("getCategoryExclusionNotice", () => {
    it("etc 카테고리에 대해 실적 제외 경고 문구를 반환해야 한다", () => {
      const notice = getCategoryExclusionNotice("etc");
      expect(notice).not.toBeNull();
      expect(notice).toContain("국세, 지방세, 아파트관리비, 상품권");
    });

    it("일반 카테고리(cafe, dining 등)는 null을 반환해야 한다", () => {
      expect(getCategoryExclusionNotice("cafe")).toBeNull();
      expect(getCategoryExclusionNotice("dining")).toBeNull();
    });
  });
});
