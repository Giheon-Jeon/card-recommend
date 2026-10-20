import type { Card, SpendingProfile } from "@/types/card";
import type { CardEvaluation, CategoryBreakdown } from "@/types/recommendation";

/** 카테고리별 지출 총합에서 전월실적 제외 카테고리를 뺀 실적 인정 금액을 계산합니다. */
export function calculateQualifyingSpend(card: Card, spending: SpendingProfile): number {
  const excluded = new Set(card.excludedCategories ?? []);
  const total = Object.entries(spending).reduce((sum, [category, amount]) => {
    if (excluded.has(category)) return sum;
    return sum + (amount || 0);
  }, 0);

  return Math.max(0, total);
}

/**
 * 실적 인정 금액을 기준으로, 조건을 만족하는 가장 높은(=혜택이 큰) 구간의 인덱스를 반환합니다.
 * tiers가 비어있거나 실적 조건을 만족하지 못하면 null을 반환합니다.
 */
export function findApplicableTierIndex(card: Card, qualifyingSpend: number): number | null {
  if (!card.tiers || card.tiers.length === 0) return null;
  let applicable: number | null = null;

  card.tiers.forEach((tier, index) => {
    if (qualifyingSpend >= tier.minSpend) {
      if (applicable === null || tier.minSpend >= card.tiers[applicable].minSpend) {
        applicable = index;
      }
    }
  });

  return applicable;
}

/**
 * 지출 프로필 객체를 캐시 키 문자열로 정규화합니다.
 */
export function serializeSpendingProfile(spending: SpendingProfile): string {
  const keys = Object.keys(spending).sort();
  let key = "";
  for (const k of keys) {
    const val = spending[k as keyof SpendingProfile] ?? 0;
    if (val > 0) {
      key += `${k}:${val};`;
    }
  }
  return key;
}

const BENEFIT_CACHE_MAX_SIZE = 2000;
const benefitEvaluationCache = new Map<string, CardEvaluation>();
let cacheHits = 0;
let cacheMisses = 0;

/** 혜택 계산 메모이제이션 캐시를 초기화합니다. */
export function clearBenefitCache(): void {
  benefitEvaluationCache.clear();
  cacheHits = 0;
  cacheMisses = 0;
}

/** 혜택 계산 캐시 통계를 반환합니다. */
export function getBenefitCacheStats(): { size: number; hits: number; misses: number; maxSize: number } {
  return {
    size: benefitEvaluationCache.size,
    hits: cacheHits,
    misses: cacheMisses,
    maxSize: BENEFIT_CACHE_MAX_SIZE,
  };
}

/** 카드 한 장에 대해 주어진 지출 프로필 기준 혜택을 계산합니다 (LRU 캐시 적용). */
export function evaluateCard(
  card: Card,
  spending: SpendingProfile,
  useCache = true,
): CardEvaluation {
  const cardKey = card.id || `${card.name}_${card.annualFee ?? 0}`;
  const cacheKey = `${cardKey}__${serializeSpendingProfile(spending)}`;

  if (useCache && benefitEvaluationCache.has(cacheKey)) {
    cacheHits++;
    const cached = benefitEvaluationCache.get(cacheKey)!;
    // LRU 최신화
    benefitEvaluationCache.delete(cacheKey);
    benefitEvaluationCache.set(cacheKey, cached);
    return cached;
  }

  cacheMisses++;
  const qualifyingSpend = calculateQualifyingSpend(card, spending);
  const tierIndex = findApplicableTierIndex(card, qualifyingSpend);

  const breakdown: CategoryBreakdown[] = [];
  let totalMonthlyBenefit = 0;

  if (tierIndex !== null && card.tiers[tierIndex]) {
    const tier = card.tiers[tierIndex];
    for (const benefit of tier.benefits) {
      const spend = Math.max(0, spending[benefit.category] ?? 0);
      const rawAmount = spend * benefit.rate;
      const cappedAmount =
        benefit.capPerMonth !== undefined ? Math.min(rawAmount, benefit.capPerMonth) : rawAmount;

      breakdown.push({
        category: benefit.category,
        spend,
        benefitAmount: cappedAmount,
        capped: benefit.capPerMonth !== undefined && rawAmount > benefit.capPerMonth,
      });

      totalMonthlyBenefit += cappedAmount;
    }
  }

  const netMonthlyBenefit = totalMonthlyBenefit - (card.annualFee || 0) / 12;

  const result: CardEvaluation = {
    card,
    qualifyingSpend,
    meetsMinimum: tierIndex !== null,
    tierIndex,
    breakdown,
    totalMonthlyBenefit,
    netMonthlyBenefit,
  };

  if (useCache) {
    if (benefitEvaluationCache.size >= BENEFIT_CACHE_MAX_SIZE) {
      const oldestKey = benefitEvaluationCache.keys().next().value;
      if (oldestKey !== undefined) {
        benefitEvaluationCache.delete(oldestKey);
      }
    }
    benefitEvaluationCache.set(cacheKey, result);
  }

  return result;
}

export interface BreakEvenAnalysis {
  annualFee: number;
  monthlyBenefit: number;
  annualBenefit: number;
  annualNetBenefit: number;
  breakEvenMonths: number | null;
  breakEvenText: string;
  isImmediate: boolean;
  isRecoverable: boolean;
}

/**
 * 연간 순혜택을 계산합니다.
 * 공식: (월간 예상 혜택 * 12) - 국내외 기본 연회비
 */
export function calculateAnnualNetBenefit(monthlyBenefit: number, annualFee: number = 0): number {
  const safeMonthly = Math.max(0, monthlyBenefit || 0);
  const safeAnnualFee = Math.max(0, annualFee || 0);
  return Math.round(safeMonthly * 12 - safeAnnualFee);
}

/**
 * 연회비 손익분기점(BEP) 소요 기간(개월 수)을 계산합니다.
 * 공식: 연회비 / 월간 예상 혜택
 * - 연회비가 0 이하: 0 (즉시 혜택)
 * - 월간 예상 혜택이 0 이하: null (회수 불가)
 */
export function calculateBreakEvenMonths(monthlyBenefit: number, annualFee: number = 0): number | null {
  const safeAnnualFee = Math.max(0, annualFee || 0);
  const safeMonthly = Math.max(0, monthlyBenefit || 0);

  if (safeAnnualFee <= 0) return 0;
  if (safeMonthly <= 0) return null;

  return safeAnnualFee / safeMonthly;
}

/**
 * 손익분기점 소요 기간 텍스트를 포맷팅합니다.
 * - 연회비 0원: "연회비 없음 (즉시 혜택)"
 * - 회수 불가: "회수 불가 (월 혜택 없음)"
 * - 1개월 미만: "당월 회수"
 * - 1개월 이상: "약 X개월" (소수점 1자리 표기)
 */
export function formatBreakEvenPeriod(breakEvenMonths: number | null, annualFee: number = 0): string {
  const safeAnnualFee = Math.max(0, annualFee || 0);
  if (safeAnnualFee <= 0) {
    return "연회비 없음 (즉시 혜택)";
  }
  if (breakEvenMonths === null || breakEvenMonths <= 0 || !Number.isFinite(breakEvenMonths)) {
    return "회수 불가 (월 혜택 없음)";
  }
  if (breakEvenMonths < 1) {
    return "당월 회수";
  }
  const formatted = Number.isInteger(breakEvenMonths)
    ? `${breakEvenMonths}개월`
    : `${breakEvenMonths.toFixed(1)}개월`;
  return `약 ${formatted}`;
}

/**
 * 월간 예상 혜택과 연회비를 바탕으로 종합 손익분기점(BEP) 및 연간 순혜택 지표를 산출합니다.
 */
export function analyzeBreakEven(monthlyBenefit: number, annualFee: number = 0): BreakEvenAnalysis {
  const safeAnnualFee = Math.max(0, annualFee || 0);
  const safeMonthly = Math.max(0, monthlyBenefit || 0);
  const annualBenefit = safeMonthly * 12;
  const annualNetBenefit = calculateAnnualNetBenefit(safeMonthly, safeAnnualFee);
  const breakEvenMonths = calculateBreakEvenMonths(safeMonthly, safeAnnualFee);
  const breakEvenText = formatBreakEvenPeriod(breakEvenMonths, safeAnnualFee);

  return {
    annualFee: safeAnnualFee,
    monthlyBenefit: safeMonthly,
    annualBenefit,
    annualNetBenefit,
    breakEvenMonths,
    breakEvenText,
    isImmediate: safeAnnualFee === 0,
    isRecoverable: safeAnnualFee === 0 || (breakEvenMonths !== null && safeMonthly > 0),
  };
}

/**
 * 카드의 기본 혜택(tiers[0])을 바탕으로 기준 지출(예: 신용 50만원, 체크 30만원)에서의 예상 월 혜택액을 추정합니다.
 * 지출 프로필이 별도로 주어지지 않았을 때 카탈로그 상세/비교에서 대표 지표로 활용됩니다.
 */
export function estimateMonthlyBenefitFromCard(card: Card, benchmarkMonthlySpend?: number): number {
  if (!card.tiers || card.tiers.length === 0) return 0;
  const tier = card.tiers[0];
  if (!tier || !tier.benefits || tier.benefits.length === 0) return 0;

  const defaultSpend = benchmarkMonthlySpend ?? (card.cardType === "check" ? 300000 : 500000);
  const categoryCount = Math.max(1, tier.benefits.length);
  const spendPerBenefit = Math.max(0, defaultSpend / categoryCount);

  let totalBenefit = 0;
  for (const b of tier.benefits) {
    const rawBenefit = spendPerBenefit * b.rate;
    const cappedBenefit = b.capPerMonth !== undefined ? Math.min(rawBenefit, b.capPerMonth) : rawBenefit;
    totalBenefit += cappedBenefit;
  }

  return Math.round(totalBenefit);
}
