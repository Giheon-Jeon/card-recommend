import { describe, it, expect } from "vitest";
import { catalogEntryToCard } from "@/lib/cardConverter";
import type { CatalogEntry } from "@/types/catalog";

describe("catalogEntryToCard", () => {
  it("혜택 요약에서 편의점 및 카페 할인율을 올바르게 추출한다", () => {
    const entry: CatalogEntry = {
      sourceId: 101,
      sourceUrl: "http://example.com/101",
      name: "테스트 신용카드",
      issuer: "테스트카드사",
      category: "신용",
      annualFee: 10000,
      benefitSummary: "GS25 편의점 10% 할인, 스타벅스 20% 적립",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    expect(card.id).toBe("catalog-101");
    expect(card.name).toBe("테스트 신용카드");
    expect(card.cardType).toBe("credit");
    expect(card.annualFee).toBe(10000);
    expect(card.tiers).toHaveLength(1);
    expect(card.tiers[0].minSpend).toBe(0);

    const benefits = card.tiers[0].benefits;
    // Should have convenience (10%) and cafe (20%)
    const convenienceBenefit = benefits.find((b) => b.category === "convenience");
    expect(convenienceBenefit).toBeDefined();
    expect(convenienceBenefit?.rate).toBeCloseTo(0.1);
    expect(convenienceBenefit?.type).toBe("discount");

    const cafeBenefit = benefits.find((b) => b.category === "cafe");
    expect(cafeBenefit).toBeDefined();
    expect(cafeBenefit?.rate).toBeCloseTo(0.2);
    expect(cafeBenefit?.type).toBe("point");
  });

  it("주유 L당 할인 정보를 약 4% 할인율로 변환한다", () => {
    const entry: CatalogEntry = {
      sourceId: 102,
      sourceUrl: "http://example.com/102",
      name: "테스트 주유카드",
      issuer: "테스트카드사",
      category: "체크",
      annualFee: 0,
      benefitSummary: "S-OIL 60원/L 할인, 모든 가맹점 0.5% 캐시백",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    expect(card.cardType).toBe("check");
    
    const benefits = card.tiers[0].benefits;
    const gasBenefit = benefits.find((b) => b.category === "gas");
    expect(gasBenefit).toBeDefined();
    expect(gasBenefit?.rate).toBeCloseTo(0.04);
    expect(gasBenefit?.type).toBe("discount");

    const etcBenefit = benefits.find((b) => b.category === "etc");
    expect(etcBenefit).toBeDefined();
    expect(etcBenefit?.rate).toBeCloseTo(0.005);
    expect(etcBenefit?.type).toBe("cashback");
  });

  it("혜택 정보가 없거나 해석할 수 없는 경우 기본 etc 혜택을 부여한다", () => {
    const entry: CatalogEntry = {
      sourceId: 103,
      sourceUrl: "http://example.com/103",
      name: "정보부족 카드",
      issuer: "테스트카드사",
      category: "신용",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    const benefits = card.tiers[0].benefits;
    expect(benefits).toHaveLength(1);
    expect(benefits[0].category).toBe("etc");
    expect(benefits[0].rate).toBeCloseTo(0.007);
    expect(benefits[0].type).toBe("discount");
  });
});
