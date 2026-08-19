import type { Card, SpendingProfile } from "@/types/card";
import type { CardEvaluation, CategoryBreakdown } from "@/types/recommendation";

/** 카테고리별 지출 총합에서 전월실적 제외 카테고리를 뺀 실적 인정 금액을 계산합니다. */
export function calculateQualifyingSpend(card: Card, spending: SpendingProfile): number {
  const excluded = new Set(card.excludedCategories ?? []);
  return Object.entries(spending).reduce((sum, [category, amount]) => {
    if (excluded.has(category)) return sum;
    return sum + (amount || 0);
  }, 0);
}

/**
 * 실적 인정 금액을 기준으로, 조건을 만족하는 가장 높은(=혜택이 큰) 구간의 인덱스를 반환합니다.
 * tiers는 minSpend 오름차순이라고 가정합니다.
 */
export function findApplicableTierIndex(card: Card, qualifyingSpend: number): number | null {
  let applicable: number | null = null;
  card.tiers.forEach((tier, index) => {
    if (qualifyingSpend >= tier.minSpend) {
      applicable = index;
    }
  });
  return applicable;
}

/** 카드 한 장에 대해 주어진 지출 프로필 기준 혜택을 계산합니다. */
export function evaluateCard(card: Card, spending: SpendingProfile): CardEvaluation {
  const qualifyingSpend = calculateQualifyingSpend(card, spending);
  const tierIndex = findApplicableTierIndex(card, qualifyingSpend);

  const breakdown: CategoryBreakdown[] = [];
  let totalMonthlyBenefit = 0;

  if (tierIndex !== null) {
    const tier = card.tiers[tierIndex];
    for (const benefit of tier.benefits) {
      const spend = spending[benefit.category] ?? 0;
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

  const netMonthlyBenefit = totalMonthlyBenefit - card.annualFee / 12;

  return {
    card,
    qualifyingSpend,
    meetsMinimum: tierIndex !== null,
    tierIndex,
    breakdown,
    totalMonthlyBenefit,
    netMonthlyBenefit,
  };
}
