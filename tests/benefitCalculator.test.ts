import { describe, it, expect } from "vitest";
import {
  evaluateCard,
  calculateQualifyingSpend,
  findApplicableTierIndex,
} from "@/lib/benefitCalculator";
import type { Card } from "@/types/card";

const sampleCard: Card = {
  id: "test-card",
  name: "테스트 카드",
  issuer: "테스트카드사",
  cardType: "credit",
  annualFee: 12000, // 월 1,000원 환산
  excludedCategories: ["mobile"],
  tiers: [
    {
      minSpend: 300000,
      benefits: [
        { category: "cafe", type: "discount", rate: 0.1, capPerMonth: 5000 },
        { category: "transport", type: "discount", rate: 0.1 },
      ],
    },
    {
      minSpend: 700000,
      benefits: [
        { category: "cafe", type: "discount", rate: 0.1, capPerMonth: 10000 },
        { category: "transport", type: "discount", rate: 0.1 },
        { category: "onlineShopping", type: "discount", rate: 0.05 },
      ],
    },
  ],
};

describe("calculateQualifyingSpend", () => {
  it("실적 제외 카테고리를 뺀 금액을 반환한다", () => {
    const spending = { cafe: 100000, mobile: 50000, transport: 30000 };
    expect(calculateQualifyingSpend(sampleCard, spending)).toBe(130000);
  });

  it("제외 카테고리가 없는 경우 전체 지출 합계를 반환한다", () => {
    const cardWithoutExcluded: Card = { ...sampleCard, excludedCategories: undefined };
    const spending = { cafe: 50000, transport: 30000 };
    expect(calculateQualifyingSpend(cardWithoutExcluded, spending)).toBe(80000);
  });

  it("빈 지출 객체나 0원 지출에 대해 0을 반환한다", () => {
    expect(calculateQualifyingSpend(sampleCard, {})).toBe(0);
    expect(calculateQualifyingSpend(sampleCard, { cafe: 0, mobile: 0 })).toBe(0);
  });

  it("음수 합산이 발생하는 경우 0으로 보정한다", () => {
    expect(calculateQualifyingSpend(sampleCard, { cafe: -50000 })).toBe(0);
  });
});

describe("findApplicableTierIndex", () => {
  it("구간이 없거나 실적 미달인 경우 null을 반환한다", () => {
    expect(findApplicableTierIndex({ ...sampleCard, tiers: [] }, 500000)).toBeNull();
    expect(findApplicableTierIndex(sampleCard, 200000)).toBeNull();
  });

  it("충족하는 구간 중 가장 높은 구간 인덱스를 반환한다", () => {
    expect(findApplicableTierIndex(sampleCard, 300000)).toBe(0);
    expect(findApplicableTierIndex(sampleCard, 700000)).toBe(1);
    expect(findApplicableTierIndex(sampleCard, 1000000)).toBe(1);
  });
});

describe("evaluateCard", () => {
  it("실적 미달이면 혜택이 0이다", () => {
    const spending = { cafe: 50000, mobile: 0, transport: 0 };
    const result = evaluateCard(sampleCard, spending);
    expect(result.meetsMinimum).toBe(false);
    expect(result.totalMonthlyBenefit).toBe(0);
    expect(result.netMonthlyBenefit).toBe(-1000);
  });

  it("1구간을 만족하면 해당 구간 혜택을 계산한다", () => {
    const spending = { cafe: 100000, mobile: 0, transport: 200000 };
    const result = evaluateCard(sampleCard, spending);
    expect(result.meetsMinimum).toBe(true);
    expect(result.tierIndex).toBe(0);
    // cafe: 100000 * 0.1 = 10000 -> cap 5000
    // transport: 200000 * 0.1 = 20000 (cap 없음)
    expect(result.totalMonthlyBenefit).toBe(25000);
    expect(result.netMonthlyBenefit).toBeCloseTo(25000 - 1000);

    const cafeBreakdown = result.breakdown.find((b) => b.category === "cafe");
    expect(cafeBreakdown?.capped).toBe(true);
    expect(cafeBreakdown?.benefitAmount).toBe(5000);

    const transportBreakdown = result.breakdown.find((b) => b.category === "transport");
    expect(transportBreakdown?.capped).toBe(false);
    expect(transportBreakdown?.benefitAmount).toBe(20000);
  });

  it("2구간을 만족하면 더 높은 한도의 혜택을 적용한다", () => {
    // 실적 인정 금액(mobile 제외) = 200000 + 300000 + 300000 = 800000 >= 700000
    const spending = { cafe: 200000, mobile: 0, transport: 300000, onlineShopping: 300000 };
    const result = evaluateCard(sampleCard, spending);
    expect(result.tierIndex).toBe(1);
    // cafe: 200000 * 0.1 = 20000 -> cap 10000
    // transport: 300000 * 0.1 = 30000 (cap 없음)
    // onlineShopping: 300000 * 0.05 = 15000
    expect(result.totalMonthlyBenefit).toBe(55000);
  });

  it("음수 지출(환불)이 포함되어도 음수 혜택이 발생하지 않는다", () => {
    const spending = { cafe: -50000, transport: 400000 };
    const result = evaluateCard(sampleCard, spending);
    expect(result.meetsMinimum).toBe(true);
    const cafeBreakdown = result.breakdown.find((b) => b.category === "cafe");
    expect(cafeBreakdown?.benefitAmount).toBe(0);
    expect(cafeBreakdown?.spend).toBe(0);
  });
});
