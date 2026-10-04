import type { Card, CategoryId } from "./card";

/** 포트폴리오 카드 조합 크기 (2장 또는 3장) */
export type PortfolioSize = 2 | 3;

/** 카테고리별 담당 카드 및 기대 혜택 정보 */
export interface CategoryAssignment {
  category: CategoryId;
  assignedCard: Card;
  spend: number;
  benefitAmount: number;
  rate: number;
}

/** 포트폴리오 내 개별 카드의 분할 지출 배분 및 실적/혜택 계산 결과 */
export interface CardPortfolioAllocation {
  card: Card;
  allocatedSpend: number;
  qualifyingSpend: number;
  meetsMinimum: boolean;
  tierIndex: number | null;
  monthlyBenefit: number;
  annualFee: number;
  netMonthlyBenefit: number;
  assignedCategories: CategoryId[];
}

/** 2장 또는 3장 카드 포트폴리오 조합 추천 결과 */
export interface PortfolioRecommendation {
  combinationSize: PortfolioSize;
  cards: Card[];
  categoryAssignments: CategoryAssignment[];
  cardAllocations: CardPortfolioAllocation[];
  totalSpend: number;
  totalMonthlyBenefit: number;
  totalAnnualFee: number;
  netMonthlyBenefit: number;
  benefitIncreaseVsSingle: number;
}

/** 2장 및 3장 최적 포트폴리오 결과 묶음 */
export interface PortfolioResult {
  pair: PortfolioRecommendation | null;
  trio: PortfolioRecommendation | null;
}

