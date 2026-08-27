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

  it("한 구절에 여러 카테고리 키워드가 포함된 경우 모든 카테고리에 혜택을 부여한다", () => {
    const entry: CatalogEntry = {
      sourceId: 104,
      sourceUrl: "http://example.com/104",
      name: "다중 카테고리 카드",
      issuer: "테스트카드사",
      category: "신용",
      benefitSummary: "이마트 및 GS25 10% 할인",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    const benefits = card.tiers[0].benefits;
    
    // mart (이마트)와 convenience (GS25) 혜택이 모두 포함되어야 함
    const martBenefit = benefits.find((b) => b.category === "mart");
    expect(martBenefit).toBeDefined();
    expect(martBenefit?.rate).toBeCloseTo(0.1);

    const convenienceBenefit = benefits.find((b) => b.category === "convenience");
    expect(convenienceBenefit).toBeDefined();
    expect(convenienceBenefit?.rate).toBeCloseTo(0.1);
  });

  it("명사가 나열된 쉼표와 혜택 구분자 쉼표를 올바르게 구분하여 분할한다", () => {
    const entry: CatalogEntry = {
      sourceId: 105,
      sourceUrl: "http://example.com/105",
      name: "나열 카드",
      issuer: "테스트카드사",
      category: "신용",
      benefitSummary: "마트,편의점 10% 할인, 스타벅스 20% 적립",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    const benefits = card.tiers[0].benefits;

    // mart (이마트/마트) 10%, convenience (편의점) 10%, cafe (스타벅스) 20%
    const martBenefit = benefits.find((b) => b.category === "mart");
    expect(martBenefit).toBeDefined();
    expect(martBenefit?.rate).toBeCloseTo(0.1);

    const convenienceBenefit = benefits.find((b) => b.category === "convenience");
    expect(convenienceBenefit).toBeDefined();
    expect(convenienceBenefit?.rate).toBeCloseTo(0.1);

    const cafeBenefit = benefits.find((b) => b.category === "cafe");
    expect(cafeBenefit).toBeDefined();
    expect(cafeBenefit?.rate).toBeCloseTo(0.2);
  });

  it("다양한 주유 리터당 할인금액(예: 150원/L)을 1,500원 기준으로 정확한 비율(10%)로 파싱한다", () => {
    const entry: CatalogEntry = {
      sourceId: 106,
      sourceUrl: "http://example.com/106",
      name: "고주유 할인카드",
      issuer: "테스트카드사",
      category: "신용",
      benefitSummary: "S-OIL 리터당 150원 할인",
      fetchedAt: new Date().toISOString(),
    };

    const card = catalogEntryToCard(entry);
    const benefits = card.tiers[0].benefits;

    const gasBenefit = benefits.find((b) => b.category === "gas");
    expect(gasBenefit).toBeDefined();
    expect(gasBenefit?.rate).toBeCloseTo(0.1);
  });

  it("마일리지 적립 카드(예: 1,500원당 1마일 적립, 1,000원당 2마일 적립)를 etc 카테고리와 정확한 할인율로 파싱한다", () => {
    const entry1: CatalogEntry = {
      sourceId: 107,
      sourceUrl: "http://example.com/107",
      name: "대한항공 마일리지 카드",
      issuer: "테스트카드사",
      category: "신용",
      benefitSummary: "대한항공 1,500원당 1마일 적립",
      fetchedAt: new Date().toISOString(),
    };

    const card1 = catalogEntryToCard(entry1);
    const benefits1 = card1.tiers[0].benefits;
    const mileBenefit1 = benefits1.find((b) => b.category === "etc");
    expect(mileBenefit1).toBeDefined();
    expect(mileBenefit1?.rate).toBeCloseTo(0.01); // (1 * 15) / 1500 = 1%
    expect(mileBenefit1?.type).toBe("point");

    const entry2: CatalogEntry = {
      sourceId: 108,
      sourceUrl: "http://example.com/108",
      name: "아시아나 마일리지 카드",
      issuer: "테스트카드사",
      category: "신용",
      benefitSummary: "아시아나 1,000원당 2마일 적립",
      fetchedAt: new Date().toISOString(),
    };

    const card2 = catalogEntryToCard(entry2);
    const benefits2 = card2.tiers[0].benefits;
    const mileBenefit2 = benefits2.find((b) => b.category === "etc");
    expect(mileBenefit2).toBeDefined();
    expect(mileBenefit2?.rate).toBeCloseTo(0.03); // (2 * 15) / 1000 = 3%
    expect(mileBenefit2?.type).toBe("point");
  });
});
