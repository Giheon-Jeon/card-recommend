import { describe, it, expect } from "vitest";
import {
  evaluateCard,
  calculateQualifyingSpend,
  findApplicableTierIndex,
  calculateAnnualNetBenefit,
  calculateBreakEvenMonths,
  formatBreakEvenPeriod,
  analyzeBreakEven,
  estimateMonthlyBenefitFromCard,
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

describe("calculateAnnualNetBenefit", () => {
  it("월 혜택 * 12에서 연회비를 차감하여 연간 순혜택을 정확히 계산한다", () => {
    // 월 30,000원 * 12 = 360,000원 - 연회비 20,000원 = 340,000원
    expect(calculateAnnualNetBenefit(30000, 20000)).toBe(340000);
  });

  it("연회비가 0원이면 연간 총 혜택과 동일하다", () => {
    expect(calculateAnnualNetBenefit(15000, 0)).toBe(180000);
  });

  it("월 혜택보다 연회비가 더 클 경우 음수(손실) 순혜택을 반환한다", () => {
    // 월 1,000원 * 12 = 12,000원 - 연회비 20,000원 = -8,000원
    expect(calculateAnnualNetBenefit(1000, 20000)).toBe(-8000);
  });

  it("월 혜택이 0원이거나 음수일 경우 0으로 보정 후 연회비만큼 음수를 반환한다", () => {
    expect(calculateAnnualNetBenefit(0, 15000)).toBe(-15000);
    expect(calculateAnnualNetBenefit(-5000, 15000)).toBe(-15000);
  });
});

describe("calculateBreakEvenMonths", () => {
  it("연회비가 0원 이하인 경우 0개월(즉시 회수)을 반환한다", () => {
    expect(calculateBreakEvenMonths(10000, 0)).toBe(0);
    expect(calculateBreakEvenMonths(10000, -5000)).toBe(0);
  });

  it("월 혜택이 0원 이하인 경우 null(회수 불가)을 반환한다", () => {
    expect(calculateBreakEvenMonths(0, 20000)).toBeNull();
    expect(calculateBreakEvenMonths(-1000, 20000)).toBeNull();
  });

  it("연회비 / 월간 혜택 비율로 정확한 회수 소요 개월 수를 계산한다", () => {
    // 연회비 12,000원, 월 혜택 4,000원 -> 3.0개월
    expect(calculateBreakEvenMonths(4000, 12000)).toBe(3);
    // 연회비 15,000원, 월 혜택 30,000원 -> 0.5개월 (당월 회수)
    expect(calculateBreakEvenMonths(30000, 15000)).toBe(0.5);
    // 연회비 20,000원, 월 혜택 6,000원 -> 약 3.333개월
    expect(calculateBreakEvenMonths(6000, 20000)).toBeCloseTo(3.333, 2);
  });
});

describe("formatBreakEvenPeriod", () => {
  it("연회비가 0원이면 '연회비 없음 (즉시 혜택)'을 반환한다", () => {
    expect(formatBreakEvenPeriod(0, 0)).toBe("연회비 없음 (즉시 혜택)");
  });

  it("회수 개월 수가 null 또는 0 이하이면 '회수 불가 (월 혜택 없음)'을 반환한다", () => {
    expect(formatBreakEvenPeriod(null, 15000)).toBe("회수 불가 (월 혜택 없음)");
    expect(formatBreakEvenPeriod(0, 15000)).toBe("회수 불가 (월 혜택 없음)");
  });

  it("1개월 미만이면 '당월 회수'를 반환한다", () => {
    expect(formatBreakEvenPeriod(0.5, 10000)).toBe("당월 회수");
    expect(formatBreakEvenPeriod(0.8, 15000)).toBe("당월 회수");
  });

  it("1개월 이상이면 정수 또는 소수점 1자리 개월 수로 포맷팅한다", () => {
    expect(formatBreakEvenPeriod(2, 20000)).toBe("약 2개월");
    expect(formatBreakEvenPeriod(3.333, 20000)).toBe("약 3.3개월");
  });
});

describe("analyzeBreakEven", () => {
  it("월 혜택과 연회비를 종합하여 BreakEvenAnalysis 객체를 정확히 구성한다", () => {
    const analysis = analyzeBreakEven(25000, 15000);
    expect(analysis.annualFee).toBe(15000);
    expect(analysis.monthlyBenefit).toBe(25000);
    expect(analysis.annualBenefit).toBe(300000);
    expect(analysis.annualNetBenefit).toBe(285000);
    expect(analysis.breakEvenMonths).toBe(0.6);
    expect(analysis.breakEvenText).toBe("당월 회수");
    expect(analysis.isImmediate).toBe(false);
    expect(analysis.isRecoverable).toBe(true);
  });

  it("체크카드(연회비 0원)에 대해 즉시 혜택 플래그와 텍스트를 제공한다", () => {
    const analysis = analyzeBreakEven(10000, 0);
    expect(analysis.annualFee).toBe(0);
    expect(analysis.annualNetBenefit).toBe(120000);
    expect(analysis.breakEvenText).toBe("연회비 없음 (즉시 혜택)");
    expect(analysis.isImmediate).toBe(true);
    expect(analysis.isRecoverable).toBe(true);
  });

  it("월 혜택이 0원일 때 회수 불가 상태를 정확히 반환한다", () => {
    const analysis = analyzeBreakEven(0, 30000);
    expect(analysis.annualNetBenefit).toBe(-30000);
    expect(analysis.breakEvenMonths).toBeNull();
    expect(analysis.breakEvenText).toBe("회수 불가 (월 혜택 없음)");
    expect(analysis.isRecoverable).toBe(false);
  });
});

describe("estimateMonthlyBenefitFromCard", () => {
  it("카드의 기본 혜택과 기준 지출을 바탕으로 예상 월 혜택을 합리적으로 계산한다", () => {
    const estimated = estimateMonthlyBenefitFromCard(sampleCard, 600000);
    // benefits: cafe (10%, cap 5000), transport (10%, cap 없음)
    // 600000 / 2 = 300,000원씩 분배
    // cafe: 300,000 * 0.1 = 30,000 -> cap 5,000
    // transport: 300,000 * 0.1 = 30,000
    // 합계: 35,000원
    expect(estimated).toBe(35000);
  });

  it("혜택이 없는 카드에 대해 0원을 반환한다", () => {
    const emptyCard: Card = { ...sampleCard, tiers: [] };
    expect(estimateMonthlyBenefitFromCard(emptyCard)).toBe(0);
  });
});
