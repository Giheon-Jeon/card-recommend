import type { Card, CategoryId, SpendingProfile } from "@/types/card";
import type {
  PortfolioSize,
  PortfolioRecommendation,
  PortfolioResult,
  CategoryAssignment,
  CardPortfolioAllocation,
} from "@/types/portfolio";
import { calculateQualifyingSpend, findApplicableTierIndex } from "./benefitCalculator";
import { rankCards } from "./recommender";

/**
 * 카드가 특정 카테고리에 대해 제공하는 가장 높은 할인/적립률과 해당 한도를 조회합니다.
 */
export function getCardBestBenefit(
  card: Card,
  category: CategoryId,
): { rate: number; capPerMonth?: number } {
  let bestRate = 0;
  let bestCap: number | undefined = undefined;

  for (const tier of card.tiers) {
    const benefit = tier.benefits.find((b) => b.category === category);
    if (benefit && benefit.rate > bestRate) {
      bestRate = benefit.rate;
      bestCap = benefit.capPerMonth;
    }
  }

  return { rate: bestRate, capPerMonth: bestCap };
}

/**
 * 주어진 카드 조합에 대해 카테고리별 담당 카드를 최적으로 배분하고 포트폴리오 혜택을 계산합니다.
 */
export function evaluateCombination(
  cards: Card[],
  spending: SpendingProfile,
  singleBestNetBenefit = 0,
  ratesLookup?: Map<string, Record<string, { rate: number; capPerMonth?: number }>>,
): PortfolioRecommendation | null {
  const activeEntries = Object.entries(spending).filter(([, amount]) => (amount || 0) > 0);
  if (activeEntries.length === 0 || cards.length < 2) {
    return null;
  }

  const combinationSize = cards.length as PortfolioSize;
  const cardAllocationsMap = new Map<string, SpendingProfile>();
  cards.forEach((c) => cardAllocationsMap.set(c.id, {}));

  // 각 카테고리별로 가장 유리한 카드와 2순위 카드의 혜택 차이를 계산
  const categoryDecisions: Array<{
    category: CategoryId;
    spend: number;
    bestCard: Card;
    bestRate: number;
    diff: number;
    candidateCards: Card[];
  }> = [];

  for (const [category, spend] of activeEntries) {
    const ratedCards = cards
      .map((card) => {
        const benefit = ratesLookup
          ? (ratesLookup.get(card.id)?.[category] ?? getCardBestBenefit(card, category))
          : getCardBestBenefit(card, category);
        return {
          card,
          ...benefit,
        };
      })
      .sort((a, b) => b.rate - a.rate);

    const best = ratedCards[0];
    const second = ratedCards[1] ?? { rate: 0 };
    const diff = best.rate - second.rate;

    const tiedCards = ratedCards
      .filter((rc) => Math.abs(rc.rate - best.rate) < 0.0001)
      .map((rc) => rc.card);

    categoryDecisions.push({
      category,
      spend,
      bestCard: best.card,
      bestRate: best.rate,
      diff,
      candidateCards: tiedCards,
    });
  }

  // 혜택 격차가 큰 카테고리(특화 카테고리) 우선 배분
  categoryDecisions.sort((a, b) => b.diff - a.diff);

  const currentSpendPerCard = new Map<string, number>();
  cards.forEach((c) => currentSpendPerCard.set(c.id, 0));

  const assignments: CategoryAssignment[] = [];

  for (const decision of categoryDecisions) {
    let chosenCard: Card;

    if (decision.diff > 0.001) {
      // 뚜렷한 특화 카드가 있는 경우 해당 카드 배정
      chosenCard = decision.bestCard;
    } else {
      // 동률이거나 일반 가맹점인 경우: 최소 실적 달성이 더 시급한 카드에 우선 배분
      const candidates = decision.candidateCards;
      chosenCard = candidates.reduce((prev, curr) => {
        const prevMin = prev.tiers[0]?.minSpend ?? 0;
        const currMin = curr.tiers[0]?.minSpend ?? 0;
        const prevCurrent = currentSpendPerCard.get(prev.id) ?? 0;
        const currCurrent = currentSpendPerCard.get(curr.id) ?? 0;

        const prevShortfall = Math.max(0, prevMin - prevCurrent);
        const currShortfall = Math.max(0, currMin - currCurrent);

        if (currShortfall !== prevShortfall) {
          return currShortfall > prevShortfall ? curr : prev;
        }
        return prevCurrent <= currCurrent ? prev : curr;
      });
    }

    // 배분 저장
    const cardProfile = cardAllocationsMap.get(chosenCard.id)!;
    cardProfile[decision.category] = (cardProfile[decision.category] || 0) + decision.spend;

    const prevTotal = currentSpendPerCard.get(chosenCard.id) ?? 0;
    currentSpendPerCard.set(chosenCard.id, prevTotal + decision.spend);

    assignments.push({
      category: decision.category,
      assignedCard: chosenCard,
      spend: decision.spend,
      benefitAmount: 0, // 아래 카드별 최종 평가에서 계산
      rate: decision.bestRate,
    });
  }

  // 조합 내 모든 카드가 최소 1개 이상의 카테고리를 담당해야 실질적인 포트폴리오로 인정
  for (const card of cards) {
    const spend = currentSpendPerCard.get(card.id) ?? 0;
    if (spend === 0) {
      return null;
    }
  }

  // 각 카드별 실적 충족 여부 및 최종 혜택 계산
  const cardAllocations: CardPortfolioAllocation[] = [];
  let totalMonthlyBenefit = 0;
  let totalAnnualFee = 0;
  let totalSpend = 0;

  for (const card of cards) {
    const allocatedProfile = cardAllocationsMap.get(card.id)!;
    const allocatedSpend = currentSpendPerCard.get(card.id) ?? 0;
    totalSpend += allocatedSpend;
    totalAnnualFee += card.annualFee;

    const qualifyingSpend = calculateQualifyingSpend(card, allocatedProfile);
    const tierIndex = findApplicableTierIndex(card, qualifyingSpend);
    const meetsMinimum = tierIndex !== null;

    let cardMonthlyBenefit = 0;
    const assignedCategories: CategoryId[] = [];

    if (meetsMinimum && tierIndex !== null) {
      const tier = card.tiers[tierIndex];
      for (const [cat, sp] of Object.entries(allocatedProfile)) {
        if (!sp || sp <= 0) continue;
        assignedCategories.push(cat);

        const benefitDef = tier.benefits.find((b) => b.category === cat);
        if (benefitDef) {
          const raw = sp * benefitDef.rate;
          const capped =
            benefitDef.capPerMonth !== undefined ? Math.min(raw, benefitDef.capPerMonth) : raw;
          cardMonthlyBenefit += capped;

          const assignment = assignments.find((a) => a.category === cat);
          if (assignment) {
            assignment.benefitAmount = capped;
            assignment.rate = benefitDef.rate;
          }
        }
      }
    } else {
      // 실적 미달 시 혜택 0원
      for (const [cat, sp] of Object.entries(allocatedProfile)) {
        if (!sp || sp <= 0) continue;
        assignedCategories.push(cat);
        const assignment = assignments.find((a) => a.category === cat);
        if (assignment) {
          assignment.benefitAmount = 0;
        }
      }
    }

    const netMonthlyBenefit = cardMonthlyBenefit - card.annualFee / 12;
    totalMonthlyBenefit += cardMonthlyBenefit;

    cardAllocations.push({
      card,
      allocatedSpend,
      qualifyingSpend,
      meetsMinimum,
      tierIndex,
      monthlyBenefit: cardMonthlyBenefit,
      annualFee: card.annualFee,
      netMonthlyBenefit,
      assignedCategories,
    });
  }

  const netMonthlyBenefit = totalMonthlyBenefit - totalAnnualFee / 12;
  const benefitIncreaseVsSingle = Math.max(0, netMonthlyBenefit - singleBestNetBenefit);

  return {
    combinationSize,
    cards,
    categoryAssignments: assignments,
    cardAllocations,
    totalSpend,
    totalMonthlyBenefit,
    totalAnnualFee,
    netMonthlyBenefit,
    benefitIncreaseVsSingle,
  };
}

/**
 * 다중 카드 조합 탐색을 위해 지출과 매칭되는 핵심 후보 카드군을 선별합니다.
 */
export function getCandidatePool(cards: Card[], spending: SpendingProfile, limit = 16): Card[] {
  if (cards.length <= limit) return cards;

  const candidateIds = new Set<string>();

  // 1. 단일 카드 랭킹 상위 카드 선별
  const ranked = rankCards(cards, spending);
  for (const r of ranked.slice(0, 6)) {
    candidateIds.add(r.card.id);
  }

  // 2. 사용자가 지출하는 각 카테고리별 최고 혜택 카드 선별
  const activeCategories = Object.entries(spending)
    .filter(([, amount]) => (amount || 0) > 0)
    .map(([cat]) => cat);

  for (const cat of activeCategories) {
    const sorted = [...cards].sort((a, b) => {
      const rateA = getCardBestBenefit(a, cat).rate;
      const rateB = getCardBestBenefit(b, cat).rate;
      return rateB - rateA;
    });

    for (const c of sorted.slice(0, 2)) {
      if (getCardBestBenefit(c, cat).rate > 0) {
        candidateIds.add(c.id);
      }
    }
  }

  // 3. 후보군이 부족한 경우 단일 순혜택 상위 카드로 채움
  for (const r of ranked) {
    if (candidateIds.size >= limit) break;
    candidateIds.add(r.card.id);
  }

  return cards.filter((c) => candidateIds.has(c.id));
}

/**
 * 2장 조합 및 3장 조합에 대해 총 순혜택을 극대화하는 최적 포트폴리오를 추천합니다.
 */
export function recommendPortfolios(
  cards: Card[],
  spending: SpendingProfile,
  options?: { candidateLimit?: number },
): PortfolioResult {
  const activeEntries = Object.entries(spending).filter(([, amount]) => (amount || 0) > 0);
  if (cards.length < 2 || activeEntries.length === 0) {
    return { pair: null, trio: null };
  }

  // 단일 최적 카드 기준 순혜택 도출
  const ranked = rankCards(cards, spending);
  const bestSingle = ranked.find((r) => r.meetsMinimum) ?? ranked[0];
  const singleBestNet = bestSingle ? bestSingle.netMonthlyBenefit : 0;

  const candidates = getCandidatePool(cards, spending, options?.candidateLimit ?? 16);
  const n = candidates.length;

  // 후보군 카드별 카테고리 혜택을 사전 계산하여 반복 연산 비용 최소화
  const ratesLookup = new Map<string, Record<string, { rate: number; capPerMonth?: number }>>();
  for (const c of candidates) {
    const rateMap: Record<string, { rate: number; capPerMonth?: number }> = {};
    for (const [cat] of activeEntries) {
      rateMap[cat] = getCardBestBenefit(c, cat);
    }
    ratesLookup.set(c.id, rateMap);
  }

  let bestPair: PortfolioRecommendation | null = null;
  let bestTrio: PortfolioRecommendation | null = null;

  // 2장 조합 탐색
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const combo = [candidates[i], candidates[j]];
      const evaluation = evaluateCombination(combo, spending, singleBestNet, ratesLookup);
      if (!evaluation) continue;

      if (!bestPair || isBetterPortfolio(evaluation, bestPair)) {
        bestPair = evaluation;
      }
    }
  }

  // 3장 조합 탐색 (후보가 3장 이상일 때)
  if (n >= 3) {
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        for (let k = j + 1; k < n; k++) {
          const combo = [candidates[i], candidates[j], candidates[k]];
          const evaluation = evaluateCombination(combo, spending, singleBestNet, ratesLookup);
          if (!evaluation) continue;

          if (!bestTrio || isBetterPortfolio(evaluation, bestTrio)) {
            bestTrio = evaluation;
          }
        }
      }
    }
  }

  return { pair: bestPair, trio: bestTrio };
}

/**
 * 두 포트폴리오 중 더 우수한 포트폴리오인지 판정합니다.
 * 1) 실적 미달 카드가 없는 조합 우선
 * 2) 순혜택액(netMonthlyBenefit) 높은 조합 우선
 * 3) 총 월 혜택액 높은 조합 우선
 * 4) 연회비 낮은 조합 우선
 */
function isBetterPortfolio(a: PortfolioRecommendation, b: PortfolioRecommendation): boolean {
  const aMeets = a.cardAllocations.every((ca) => ca.meetsMinimum);
  const bMeets = b.cardAllocations.every((ca) => ca.meetsMinimum);

  if (aMeets !== bMeets) {
    return aMeets;
  }

  if (Math.abs(a.netMonthlyBenefit - b.netMonthlyBenefit) > 1) {
    return a.netMonthlyBenefit > b.netMonthlyBenefit;
  }

  if (Math.abs(a.totalMonthlyBenefit - b.totalMonthlyBenefit) > 1) {
    return a.totalMonthlyBenefit > b.totalMonthlyBenefit;
  }

  return a.totalAnnualFee < b.totalAnnualFee;
}
