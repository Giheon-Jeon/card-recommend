import type { Card, CategoryId, SpendingProfile } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import { evaluateCard } from "./benefitCalculator";

/**
 * 보유 카드 전체를 지출 프로필 기준으로 평가하고, 순혜택(netMonthlyBenefit) 내림차순으로 정렬합니다.
 * 1. 월 순혜택 내림차순
 * 2. 동일할 경우 월 총 혜택액 내림차순
 * 3. 동일할 경우 연회비 오름차순
 * 4. 동일할 경우 카드 이름 오름차순
 * 실적 미달 카드도 결과에는 포함하되 meetsMinimum: false 로 표시되므로, 화면에서 필터링해서 보여줄 수 있습니다.
 */
export function rankCards(cards: Card[], spending: SpendingProfile): CardEvaluation[] {
  return cards
    .map((card) => evaluateCard(card, spending))
    .sort((a, b) => {
      if (b.netMonthlyBenefit !== a.netMonthlyBenefit) {
        return b.netMonthlyBenefit - a.netMonthlyBenefit;
      }
      if (b.totalMonthlyBenefit !== a.totalMonthlyBenefit) {
        return b.totalMonthlyBenefit - a.totalMonthlyBenefit;
      }
      if (a.card.annualFee !== b.card.annualFee) {
        return a.card.annualFee - b.card.annualFee;
      }
      return a.card.name.localeCompare(b.card.name);
    });
}

/**
 * 카테고리별로 가장 유리한 카드를 매칭합니다.
 * "편의점은 A카드, 대중교통은 B카드" 처럼 여러 장을 조합해 쓰는 전략을 세울 때 사용합니다.
 * 실적 조건을 만족하고 해당 카테고리 혜택이 0원 초과인 카드만 후보로 고려합니다.
 * 동일 혜택 금액인 경우 순혜택이 더 크거나 연회비가 더 저렴한 카드를 우선합니다.
 */
export function bestCardPerCategory(
  cards: Card[],
  spending: SpendingProfile,
  categories: CategoryId[],
): CategoryWinner[] {
  const evaluations = cards
    .map((card) => evaluateCard(card, spending))
    .filter((evaluation) => evaluation.meetsMinimum);

  return categories.map((category) => {
    let winner: CategoryWinner = { category, bestCard: null, benefitAmount: 0 };
    let winnerEval: CardEvaluation | null = null;

    for (const evaluation of evaluations) {
      const entry = evaluation.breakdown.find((b) => b.category === category);
      if (!entry || entry.benefitAmount <= 0) continue;

      if (entry.benefitAmount > winner.benefitAmount) {
        winner = { category, bestCard: evaluation.card, benefitAmount: entry.benefitAmount };
        winnerEval = evaluation;
      } else if (entry.benefitAmount === winner.benefitAmount && winnerEval) {
        if (
          evaluation.netMonthlyBenefit > winnerEval.netMonthlyBenefit ||
          (evaluation.netMonthlyBenefit === winnerEval.netMonthlyBenefit &&
            evaluation.card.annualFee < winnerEval.card.annualFee)
        ) {
          winner = { category, bestCard: evaluation.card, benefitAmount: entry.benefitAmount };
          winnerEval = evaluation;
        }
      }
    }

    return winner;
  });
}
