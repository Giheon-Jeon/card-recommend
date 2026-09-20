import { describe, it, expect } from "vitest";
import {
  recommendPortfolios,
  evaluateCombination,
  getCardBestBenefit,
} from "@/lib/portfolioRecommender";
import { catalogCards } from "@/lib/loadCatalog";
import { catalogEntryToCard } from "@/lib/cardConverter";
import type { Card } from "@/types/card";

// 테스트용 특화 카드 정의
const cardA: Card = {
  id: "card-a",
  name: "카드 A (카페 특화)",
  issuer: "A사",
  cardType: "credit",
  annualFee: 12000, // 월 1,000원
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [
        { category: "cafe", type: "discount", rate: 0.2, capPerMonth: 20000 },
        { category: "transport", type: "discount", rate: 0.05, capPerMonth: 5000 },
      ],
    },
  ],
};

const cardB: Card = {
  id: "card-b",
  name: "카드 B (교통 특화)",
  issuer: "B사",
  cardType: "credit",
  annualFee: 12000, // 월 1,000원
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [
        { category: "cafe", type: "discount", rate: 0.05, capPerMonth: 5000 },
        { category: "transport", type: "discount", rate: 0.2, capPerMonth: 20000 },
      ],
    },
  ],
};

const cardC: Card = {
  id: "card-c",
  name: "카드 C (쇼핑 특화)",
  issuer: "C사",
  cardType: "credit",
  annualFee: 12000, // 월 1,000원
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [
        { category: "onlineShopping", type: "discount", rate: 0.15, capPerMonth: 30000 },
      ],
    },
  ],
};

describe("portfolioRecommender - getCardBestBenefit", () => {
  it("카드의 최고 할인율 및 한도를 올바르게 반환해야 한다", () => {
    const cafeBenefit = getCardBestBenefit(cardA, "cafe");
    expect(cafeBenefit.rate).toBe(0.2);
    expect(cafeBenefit.capPerMonth).toBe(20000);

    const shoppingBenefit = getCardBestBenefit(cardA, "onlineShopping");
    expect(shoppingBenefit.rate).toBe(0);
  });
});

describe("portfolioRecommender - evaluateCombination", () => {
  it("특화 카테고리별로 최적 카드를 배분하고 개별 카드 실적 및 합산 순혜택을 정확히 계산해야 한다", () => {
    // 소비: 카페 200,000원, 교통 200,000원
    // 카드 A: 카페 담당 -> 실적 200,000원 충족, 혜택 200,000 * 0.2 = 40,000 -> 한도 20,000원
    // 카드 B: 교통 담당 -> 실적 200,000원 충족, 혜택 200,000 * 0.2 = 40,000 -> 한도 20,000원
    // 총 혜택: 40,000원
    // 총 연회비: 24,000원 (월 2,000원)
    // 총 월 순혜택: 40,000 - 2,000 = 38,000원
    const spending = { cafe: 200000, transport: 200000 };
    const result = evaluateCombination([cardA, cardB], spending, 19000);

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.combinationSize).toBe(2);
    expect(result.totalSpend).toBe(400000);
    expect(result.totalMonthlyBenefit).toBe(40000);
    expect(result.totalAnnualFee).toBe(24000);
    expect(result.netMonthlyBenefit).toBe(38000);
    expect(result.benefitIncreaseVsSingle).toBe(19000); // 38000 - 19000

    // 카테고리 배분 검증
    const cafeAssign = result.categoryAssignments.find((a) => a.category === "cafe");
    expect(cafeAssign?.assignedCard.id).toBe("card-a");
    expect(cafeAssign?.benefitAmount).toBe(20000);

    const transportAssign = result.categoryAssignments.find((a) => a.category === "transport");
    expect(transportAssign?.assignedCard.id).toBe("card-b");
    expect(transportAssign?.benefitAmount).toBe(20000);

    // 카드별 실적 충족 여부 검증
    expect(result.cardAllocations.every((ca) => ca.meetsMinimum)).toBe(true);
  });

  it("카드가 실적 최소 기준을 충족하지 못하면 해당 카드의 혜택은 0원으로 계산되어야 한다", () => {
    // 카드 B에 배분된 금액이 100,000원(실적 기준 200,000원 미달)인 경우
    const spending = { cafe: 200000, transport: 100000 };
    const result = evaluateCombination([cardA, cardB], spending, 15000);

    expect(result).not.toBeNull();
    if (!result) return;

    const allocA = result.cardAllocations.find((ca) => ca.card.id === "card-a");
    const allocB = result.cardAllocations.find((ca) => ca.card.id === "card-b");

    expect(allocA?.meetsMinimum).toBe(true);
    expect(allocA?.monthlyBenefit).toBe(20000);

    expect(allocB?.meetsMinimum).toBe(false);
    expect(allocB?.monthlyBenefit).toBe(0);
    expect(allocB?.netMonthlyBenefit).toBe(-1000); // 0 - 연회비 월 1,000원
  });

  it("지출 내역이 없거나 유효 지출 카테고리가 없으면 null을 반환해야 한다", () => {
    const result = evaluateCombination([cardA, cardB], { cafe: 0, transport: 0 });
    expect(result).toBeNull();
  });
});

describe("portfolioRecommender - recommendPortfolios", () => {
  it("2장 및 3장 최적 포트폴리오를 올바르게 추천해야 한다", () => {
    const spending = {
      cafe: 200000,
      transport: 200000,
      onlineShopping: 200000,
    };

    const cards = [cardA, cardB, cardC];
    const { pair, trio } = recommendPortfolios(cards, spending);

    // 2장 최적 조합: 카페(cardA) + 교통(cardB) 또는 쇼핑(cardC) 등
    expect(pair).not.toBeNull();
    expect(pair?.combinationSize).toBe(2);
    expect(pair?.cards.length).toBe(2);

    // 3장 최적 조합: cardA + cardB + cardC 3장이 각각 카페, 교통, 쇼핑을 전담
    expect(trio).not.toBeNull();
    expect(trio?.combinationSize).toBe(3);
    expect(trio?.cards.length).toBe(3);

    // 3장 조합에서 총 혜택: 20,000(카페) + 20,000(교통) + 30,000(쇼핑) = 70,000원
    // 총 연회비: 36,000원 (월 3,000원)
    // 순혜택: 70,000 - 3,000 = 67,000원
    expect(trio?.totalMonthlyBenefit).toBe(70000);
    expect(trio?.netMonthlyBenefit).toBe(67000);
  });

  it("카드가 1장 이하이거나 지출이 없으면 pair와 trio 모두 null을 반환해야 한다", () => {
    expect(recommendPortfolios([cardA], { cafe: 100000 })).toEqual({ pair: null, trio: null });
    expect(recommendPortfolios([cardA, cardB], {})).toEqual({ pair: null, trio: null });
  });

  it("전체 카탈로그(50장 이상)를 대상으로 포트폴리오 추천이 100ms 이내에 완료되어야 한다", () => {
    const allCards = catalogCards.map(catalogEntryToCard);
    expect(allCards.length).toBeGreaterThan(40);

    const spending = {
      cafe: 100000,
      transport: 150000,
      mart: 200000,
      onlineShopping: 300000,
      dining: 200000,
      convenience: 50000,
    };

    const startTime = performance.now();
    const result = recommendPortfolios(allCards, spending);
    const duration = performance.now() - startTime;

    expect(result.pair).not.toBeNull();
    expect(result.trio).not.toBeNull();
    expect(duration).toBeLessThan(100);
  });
});
