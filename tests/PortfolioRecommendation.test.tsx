import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PortfolioRecommendationView } from "@/components/PortfolioRecommendation";
import { RecommendationResult } from "@/components/RecommendationResult";
import type { PortfolioResult, PortfolioRecommendation } from "@/types/portfolio";
import type { Card, Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";

const mockCategories: Category[] = [
  { id: "cafe", label: "카페/디저트" },
  { id: "transport", label: "대중교통" },
  { id: "onlineShopping", label: "온라인쇼핑" },
];

const mockCardA: Card = {
  id: "catalog-101",
  name: "신한 마이카페 카드",
  issuer: "신한카드",
  cardType: "credit",
  annualFee: 12000,
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [{ category: "cafe", type: "discount", rate: 0.2, capPerMonth: 20000 }],
    },
  ],
};

const mockCardB: Card = {
  id: "catalog-102",
  name: "현대 모빌리티 카드",
  issuer: "현대카드",
  cardType: "credit",
  annualFee: 12000,
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [{ category: "transport", type: "discount", rate: 0.2, capPerMonth: 20000 }],
    },
  ],
};

const mockCardC: Card = {
  id: "catalog-103",
  name: "삼성 온라인쇼핑 카드",
  issuer: "삼성카드",
  cardType: "credit",
  annualFee: 12000,
  excludedCategories: [],
  tiers: [
    {
      minSpend: 200000,
      benefits: [{ category: "onlineShopping", type: "discount", rate: 0.15, capPerMonth: 30000 }],
    },
  ],
};

const mockPairPortfolio: PortfolioRecommendation = {
  combinationSize: 2,
  cards: [mockCardA, mockCardB],
  categoryAssignments: [
    {
      category: "cafe",
      assignedCard: mockCardA,
      spend: 200000,
      benefitAmount: 20000,
      rate: 0.2,
    },
    {
      category: "transport",
      assignedCard: mockCardB,
      spend: 200000,
      benefitAmount: 20000,
      rate: 0.2,
    },
  ],
  cardAllocations: [
    {
      card: mockCardA,
      allocatedSpend: 200000,
      qualifyingSpend: 200000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 20000,
      annualFee: 12000,
      netMonthlyBenefit: 19000,
      assignedCategories: ["cafe"],
    },
    {
      card: mockCardB,
      allocatedSpend: 200000,
      qualifyingSpend: 200000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 20000,
      annualFee: 12000,
      netMonthlyBenefit: 19000,
      assignedCategories: ["transport"],
    },
  ],
  totalSpend: 400000,
  totalMonthlyBenefit: 40000,
  totalAnnualFee: 24000,
  netMonthlyBenefit: 38000,
  benefitIncreaseVsSingle: 19000,
};

const mockTrioPortfolio: PortfolioRecommendation = {
  combinationSize: 3,
  cards: [mockCardA, mockCardB, mockCardC],
  categoryAssignments: [
    {
      category: "cafe",
      assignedCard: mockCardA,
      spend: 200000,
      benefitAmount: 20000,
      rate: 0.2,
    },
    {
      category: "transport",
      assignedCard: mockCardB,
      spend: 200000,
      benefitAmount: 20000,
      rate: 0.2,
    },
    {
      category: "onlineShopping",
      assignedCard: mockCardC,
      spend: 200000,
      benefitAmount: 30000,
      rate: 0.15,
    },
  ],
  cardAllocations: [
    {
      card: mockCardA,
      allocatedSpend: 200000,
      qualifyingSpend: 200000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 20000,
      annualFee: 12000,
      netMonthlyBenefit: 19000,
      assignedCategories: ["cafe"],
    },
    {
      card: mockCardB,
      allocatedSpend: 200000,
      qualifyingSpend: 200000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 20000,
      annualFee: 12000,
      netMonthlyBenefit: 19000,
      assignedCategories: ["transport"],
    },
    {
      card: mockCardC,
      allocatedSpend: 200000,
      qualifyingSpend: 200000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 30000,
      annualFee: 12000,
      netMonthlyBenefit: 29000,
      assignedCategories: ["onlineShopping"],
    },
  ],
  totalSpend: 600000,
  totalMonthlyBenefit: 70000,
  totalAnnualFee: 36000,
  netMonthlyBenefit: 67000,
  benefitIncreaseVsSingle: 48000,
};

const mockPortfolioResult: PortfolioResult = {
  pair: mockPairPortfolio,
  trio: mockTrioPortfolio,
};

const mockRanked: CardEvaluation[] = [
  {
    card: mockCardA,
    qualifyingSpend: 400000,
    meetsMinimum: true,
    tierIndex: 0,
    breakdown: [{ category: "cafe", spend: 200000, benefitAmount: 20000, capped: true }],
    totalMonthlyBenefit: 20000,
    netMonthlyBenefit: 19000,
  },
];

const mockCategoryWinners: CategoryWinner[] = [
  { category: "cafe", bestCard: mockCardA, benefitAmount: 20000 },
  { category: "transport", bestCard: mockCardB, benefitAmount: 20000 },
];

describe("PortfolioRecommendationView Component", () => {
  it("2장 및 3장 조합 전환, 핵심 지표 및 카테고리별 배분표가 정상 렌더링되어야 한다", () => {
    render(
      <PortfolioRecommendationView
        portfolioResult={mockPortfolioResult}
        categories={mockCategories}
      />,
    );

    // 섹션 타이틀 및 2장 조합 기본 표시
    expect(screen.getByText("최적 다중 카드 포트폴리오 조합")).toBeInTheDocument();
    expect(screen.getByText("2장 포트폴리오 월 순혜택")).toBeInTheDocument();
    expect(screen.getByText("38,000원")).toBeInTheDocument();

    // 단일 1위 대비 추가 이득 뱃지 확인
    expect(screen.getByText(/\+단일 1위 대비 19,000원 추가 이득/)).toBeInTheDocument();

    // 카테고리별 배분표 및 범례 확인
    expect(screen.getByText("카페/디저트")).toBeInTheDocument();
    expect(screen.getByText("대중교통")).toBeInTheDocument();
    expect(screen.getAllByText("신한 마이카페 카드").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("현대 모빌리티 카드").length).toBeGreaterThanOrEqual(1);

    // 3장 조합 탭 클릭 전환
    const trioTab = screen.getByRole("tab", { name: "3장 조합" });
    fireEvent.click(trioTab);

    // 3장 조합 지표 갱신 확인
    expect(screen.getByText("3장 포트폴리오 월 순혜택")).toBeInTheDocument();
    expect(screen.getByText("67,000원")).toBeInTheDocument();
    expect(screen.getAllByText("삼성 온라인쇼핑 카드").length).toBeGreaterThanOrEqual(1);
  });

  it("내 카드 일괄 추가 버튼을 누르면 담기지 않은 카드 sourceId 목록으로 onAddCards가 호출되어야 한다", () => {
    const handleAdd = vi.fn();
    render(
      <PortfolioRecommendationView
        portfolioResult={mockPortfolioResult}
        categories={mockCategories}
        myCardIds={[101]} // 101번은 이미 내 카드에 있음
        onAddCards={handleAdd}
      />,
    );

    // 미보유 카드(102번 현대카드) 1장 일괄 추가 버튼
    const addBtn = screen.getByRole("button", {
      name: /조합 카드 1장 '내 카드'에 일괄 추가/,
    });
    expect(addBtn).toBeInTheDocument();
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);
    expect(handleAdd).toHaveBeenCalledWith([102]);
  });

  it("모든 카드가 이미 내 카드에 담겨 있으면 일괄 추가 버튼이 비활성화되어야 한다", () => {
    render(
      <PortfolioRecommendationView
        portfolioResult={mockPortfolioResult}
        categories={mockCategories}
        myCardIds={[101, 102]} // 2장 모두 이미 담김
        onAddCards={vi.fn()}
      />,
    );

    const doneBtn = screen.getByRole("button", {
      name: /조합 카드 모두 '내 카드'에 담김/,
    });
    expect(doneBtn).toBeInTheDocument();
    expect(doneBtn).toBeDisabled();
  });

  it("포트폴리오 탭과 탭패널의 WAI-ARIA 접근성 속성이 올바르게 매핑되어야 한다", () => {
    render(
      <PortfolioRecommendationView
        portfolioResult={mockPortfolioResult}
        categories={mockCategories}
        myCardIds={[]}
      />,
    );

    const tab2 = screen.getByRole("tab", { name: "2장 조합" });
    expect(tab2).toHaveAttribute("aria-controls", "portfolio-tabpanel");

    const tabpanel = screen.getByRole("tabpanel");
    expect(tabpanel).toHaveAttribute("id", "portfolio-tabpanel");
    expect(tabpanel).toHaveAttribute("aria-labelledby", "portfolio-tab-2");
  });
});


describe("RecommendationResult Component with Portfolio Tab", () => {
  it("단일 카드 추천과 다중 카드 포트폴리오 탭 간 전환이 정상 동작해야 한다", () => {
    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={mockCategoryWinners}
        categories={mockCategories}
        portfolioResult={mockPortfolioResult}
        myCardIds={[]}
      />,
    );

    // 기본적으로 단일 최적 카드 표시
    expect(screen.getByText("최적의 카드 1장")).toBeInTheDocument();
    expect(screen.getByText("카테고리별 최적 카드 (단일 기준)")).toBeInTheDocument();

    // 다중 카드 포트폴리오 탭 클릭
    const portfolioTab = screen.getByRole("tab", { name: /다중 카드 포트폴리오/ });
    fireEvent.click(portfolioTab);

    // 포트폴리오 섹션 표시
    expect(screen.getByText("최적 다중 카드 포트폴리오 조합")).toBeInTheDocument();
    expect(screen.getByText("2장 포트폴리오 월 순혜택")).toBeInTheDocument();
  });
});
