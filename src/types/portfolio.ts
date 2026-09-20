import type { Card, CategoryId } from "./card";

export type PortfolioSize = 2 | 3;

export interface CategoryAssignment {
  category: CategoryId;
  assignedCard: Card;
  spend: number;
  benefitAmount: number;
  rate: number;
}

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

export interface PortfolioResult {
  pair: PortfolioRecommendation | null;
  trio: PortfolioRecommendation | null;
}
