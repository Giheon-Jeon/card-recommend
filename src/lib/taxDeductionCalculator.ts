import type { Card } from "@/types/card";

/**
 * 근로소득 연말정산 신용/체크카드 소득공제 규정 (조세특례제한법 제126조의2)
 * - 총급여 25% 초과 사용금액에 대해 공제
 * - 신용카드: 15%
 * - 체크카드 / 현금영수증: 30%
 */

export interface TaxDeductionInput {
  /** 연간 총급여액 (기본값: 50,000,000원) */
  annualSalary?: number;
  /** 해당 카드의 연간 예상 총 사용금액 (월 지출액 * 12) */
  annualSpend: number;
  /** 카드 유형 (신용 or 체크) */
  cardType?: "credit" | "check";
}

export interface TaxDeductionResult {
  /** 연간 총급여 */
  annualSalary: number;
  /** 기본 공제 문턱 (총급여의 25%) */
  threshold: number;
  /** 연간 카드 지출액 */
  annualSpend: number;
  /** 카드 유형 */
  cardType: "credit" | "check";
  /** 소득공제율 (신용 15%, 체크 30%) */
  deductionRate: number;
  /** 법정 기본 공제 한도 (총급여 기준 200만~300만원) */
  deductionLimit: number;
  /** 문턱 초과 사용금액 */
  excessSpend: number;
  /** 계산된 소득공제 금액 (한도 적용) */
  deductionAmount: number;
  /** 적용 한계소득세율 (지방소득세 10% 포함) */
  marginalTaxRate: number;
  /** 연간 예상 절세 환급액 */
  annualTaxSavings: number;
  /** 월 환산 예상 절세 환급액 */
  monthlyTaxSavings: number;
}

export interface PickingRateResult {
  /** 총 지출액 */
  totalSpend: number;
  /** 순수 카드 혜택금액 (할인/적립) */
  benefitAmount: number;
  /** 순수 피킹률 (%) */
  pickingRate: number;
  /** 피킹률 등급 라벨 */
  tierLabel: "최고 혜택" | "우수" | "무난" | "낮음";
  /** 소득공제 절세액 포함 피킹률 (%) */
  adjustedPickingRate?: number;
}

/**
 * 총급여 수준에 따른 법정 카드 소득공제 기본 한도를 반환합니다.
 * - 7천만원 이하: 300만원
 * - 7천만원 초과 1.2억원 이하: 250만원
 * - 1.2억원 초과: 200만원
 */
export function getTaxDeductionLimit(annualSalary: number): number {
  if (annualSalary <= 70000000) return 3000000;
  if (annualSalary <= 120000000) return 2500000;
  return 2000000;
}

/**
 * 총급여에 따른 예상 소득세 한계세율을 반환합니다 (지방소득세 10% 포함).
 * 과세표준 구간 근사치:
 * - 1,400만원 이하: 6.6% (0.066)
 * - 5,000만원 이하: 16.5% (0.165)
 * - 8,800만원 이하: 26.4% (0.264)
 * - 1.5억원 이하: 38.5% (0.385)
 * - 1.5억원 초과: 41.8% (0.418)
 */
export function getMarginalTaxRate(annualSalary: number): number {
  if (annualSalary <= 14000000) return 0.066;
  if (annualSalary <= 50000000) return 0.165;
  if (annualSalary <= 88000000) return 0.264;
  if (annualSalary <= 150000000) return 0.385;
  return 0.418;
}

/**
 * 신용/체크카드 사용에 따른 연말정산 소득공제액 및 절세 환급액을 계산합니다.
 */
export function calculateCardTaxSavings(input: TaxDeductionInput): TaxDeductionResult {
  const annualSalary = Math.max(0, input.annualSalary ?? 50000000);
  const annualSpend = Math.max(0, input.annualSpend || 0);
  const cardType = input.cardType === "check" ? "check" : "credit";

  const threshold = Math.round(annualSalary * 0.25);
  const deductionRate = cardType === "check" ? 0.3 : 0.15;
  const deductionLimit = getTaxDeductionLimit(annualSalary);
  const marginalTaxRate = getMarginalTaxRate(annualSalary);

  const excessSpend = Math.max(0, annualSpend - threshold);
  const rawDeduction = excessSpend * deductionRate;
  const deductionAmount = Math.min(rawDeduction, deductionLimit);

  const annualTaxSavings = Math.round(deductionAmount * marginalTaxRate);
  const monthlyTaxSavings = Math.round(annualTaxSavings / 12);

  return {
    annualSalary,
    threshold,
    annualSpend,
    cardType,
    deductionRate,
    deductionLimit,
    excessSpend,
    deductionAmount,
    marginalTaxRate,
    annualTaxSavings,
    monthlyTaxSavings,
  };
}

/**
 * 주어진 월 지출액과 월 혜택액을 바탕으로 피킹률(Picking Rate)을 계산합니다.
 * 공식: (혜택액 / 총지출액) * 100
 */
export function calculatePickingRate(
  monthlySpend: number,
  monthlyBenefit: number,
  monthlyTaxSavings = 0,
): PickingRateResult {
  const safeSpend = Math.max(0, monthlySpend || 0);
  const safeBenefit = Math.max(0, monthlyBenefit || 0);
  const safeTaxSavings = Math.max(0, monthlyTaxSavings || 0);

  if (safeSpend <= 0) {
    return {
      totalSpend: 0,
      benefitAmount: safeBenefit,
      pickingRate: 0,
      tierLabel: "낮음",
      adjustedPickingRate: 0,
    };
  }

  const rawPickingRate = (safeBenefit / safeSpend) * 100;
  const pickingRate = Math.round(rawPickingRate * 10) / 10;

  const adjustedRate = ((safeBenefit + safeTaxSavings) / safeSpend) * 100;
  const adjustedPickingRate = Math.round(adjustedRate * 10) / 10;

  let tierLabel: PickingRateResult["tierLabel"] = "낮음";
  if (pickingRate >= 5.0) {
    tierLabel = "최고 혜택";
  } else if (pickingRate >= 3.0) {
    tierLabel = "우수";
  } else if (pickingRate >= 1.5) {
    tierLabel = "무난";
  } else {
    tierLabel = "낮음";
  }

  return {
    totalSpend: safeSpend,
    benefitAmount: safeBenefit,
    pickingRate,
    tierLabel,
    adjustedPickingRate,
  };
}

/**
 * 카드의 유형과 월 지출액을 바탕으로 월간 예상 절세액과 조정된 월 순혜택을 산출합니다.
 */
export function evaluateCardWithTaxSavings(
  card: Card,
  monthlySpend: number,
  monthlyNetBenefit: number,
  annualSalary = 50000000,
): {
  taxResult: TaxDeductionResult;
  pickingRate: PickingRateResult;
  combinedMonthlyNetBenefit: number;
} {
  const cardType = card.cardType === "check" ? "check" : "credit";
  const annualSpend = monthlySpend * 12;

  const taxResult = calculateCardTaxSavings({
    annualSalary,
    annualSpend,
    cardType,
  });

  const pickingRate = calculatePickingRate(
    monthlySpend,
    Math.max(0, monthlyNetBenefit),
    taxResult.monthlyTaxSavings,
  );

  const combinedMonthlyNetBenefit = Math.round(monthlyNetBenefit + taxResult.monthlyTaxSavings);

  return {
    taxResult,
    pickingRate,
    combinedMonthlyNetBenefit,
  };
}
