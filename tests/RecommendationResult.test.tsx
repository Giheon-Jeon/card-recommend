import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RecommendationResult } from "@/components/RecommendationResult";
import type { Card, Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import type { PortfolioResult } from "@/types/portfolio";

const mockCategories: Category[] = [
  { id: "cafe", label: "카페/디저트" },
  { id: "transport", label: "대중교통" },
  { id: "dining", label: "외식/식비" },
];

const mockCardA: Card = {
  id: "card-1",
  name: "신한 마이카페 카드",
  issuer: "신한카드",
  cardType: "credit",
  annualFee: 12000,
  tiers: [
    {
      minSpend: 300000,
      benefits: [{ category: "cafe", type: "discount", rate: 0.1, capPerMonth: 10000 }],
    },
  ],
};

const mockCardB: Card = {
  id: "card-2",
  name: "KB 굿모빌리티 카드",
  issuer: "KB국민카드",
  cardType: "check",
  annualFee: 0,
  tiers: [
    {
      minSpend: 200000,
      benefits: [{ category: "transport", type: "discount", rate: 0.1, capPerMonth: 8000 }],
    },
  ],
};

describe("RecommendationResult Component", () => {
  it("실적을 충족한 카드가 있을 때 최적의 카드 배너와 상세 정보를 렌더링한다", () => {
    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardA,
        qualifyingSpend: 400000,
        meetsMinimum: true,
        tierIndex: 0,
        breakdown: [
          { category: "cafe", spend: 100000, benefitAmount: 10000, capped: true },
        ],
        totalMonthlyBenefit: 10000,
        netMonthlyBenefit: 9000,
      },
    ];

    const mockWinners: CategoryWinner[] = [
      { category: "cafe", bestCard: mockCardA, benefitAmount: 10000 },
      { category: "transport", bestCard: null, benefitAmount: 0 },
    ];

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={mockWinners}
        categories={mockCategories}
      />,
    );

    // 최적 카드 배너 확인
    const topBanner = screen.getByTestId("top-card-banner");
    expect(topBanner).toBeInTheDocument();
    expect(within(topBanner).getByText("신한 마이카페 카드")).toBeInTheDocument();
    expect(within(topBanner).getByText(/신한카드 · 신용카드/)).toBeInTheDocument();
    expect(within(topBanner).getByText(/연회비 12,000원 · 전월실적 인정금액 400,000원/)).toBeInTheDocument();
    expect(within(topBanner).getByText("9,000원")).toBeInTheDocument(); // 순혜택
    expect(within(topBanner).getByText("+10,000원")).toBeInTheDocument(); // 총 혜택액
    expect(within(topBanner).getByText("-1,000원")).toBeInTheDocument(); // 월 연회비
    expect(within(topBanner).getByTestId("card-exclusion-warning-badge")).toBeInTheDocument();
    expect(within(topBanner).getByText(/실적 제외 주의/)).toBeInTheDocument();

    // 카테고리별 그리드 확인
    const winnersGrid = screen.getByTestId("category-winners-grid");
    expect(winnersGrid).toBeInTheDocument();
    expect(within(winnersGrid).getByText("카페/디저트")).toBeInTheDocument();
    expect(within(winnersGrid).getByText("+10,000원")).toBeInTheDocument();
    expect(within(winnersGrid).getByText("해당 없음")).toBeInTheDocument();
  });

  it("실적 충족 카드가 전혀 없을 경우 실적 미달 안내 메시지를 렌더링한다", () => {
    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardA,
        qualifyingSpend: 100000,
        meetsMinimum: false,
        tierIndex: null,
        breakdown: [],
        totalMonthlyBenefit: 0,
        netMonthlyBenefit: -1000,
      },
    ];

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={[]}
        categories={mockCategories}
      />,
    );

    expect(screen.queryByTestId("top-card-banner")).not.toBeInTheDocument();
    expect(screen.getByTestId("no-eligible-card")).toBeInTheDocument();
    expect(
      screen.getByText("전월실적을 충족하는 카드가 없습니다"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("no-category-winners")).toBeInTheDocument();
  });

  it("포트폴리오 결과가 주어지면 탭 전환 버튼이 렌더링되고 클릭 시 뷰가 전환된다", () => {
    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardA,
        qualifyingSpend: 400000,
        meetsMinimum: true,
        tierIndex: 0,
        breakdown: [],
        totalMonthlyBenefit: 10000,
        netMonthlyBenefit: 9000,
      },
    ];

    const mockPortfolio: PortfolioResult = {
      pair: {
        combinationSize: 2,
        cards: [mockCardA, mockCardB],
        categoryAssignments: [
          { category: "cafe", assignedCard: mockCardA, spend: 200000, benefitAmount: 10000, rate: 0.1 },
          { category: "transport", assignedCard: mockCardB, spend: 200000, benefitAmount: 8000, rate: 0.1 },
        ],
        cardAllocations: [
          {
            card: mockCardA,
            allocatedSpend: 200000,
            qualifyingSpend: 200000,
            meetsMinimum: true,
            tierIndex: 0,
            monthlyBenefit: 10000,
            annualFee: 12000,
            netMonthlyBenefit: 9000,
            assignedCategories: ["cafe"],
          },
          {
            card: mockCardB,
            allocatedSpend: 200000,
            qualifyingSpend: 200000,
            meetsMinimum: true,
            tierIndex: 0,
            monthlyBenefit: 8000,
            annualFee: 0,
            netMonthlyBenefit: 8000,
            assignedCategories: ["transport"],
          },
        ],
        totalSpend: 400000,
        totalMonthlyBenefit: 18000,
        totalAnnualFee: 12000,
        netMonthlyBenefit: 17000,
        benefitIncreaseVsSingle: 8000,
      },
      trio: null,
      topSingleCard: mockCardA,
    };

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={[]}
        categories={mockCategories}
        portfolioResult={mockPortfolio}
      />,
    );

    // 탭 헤더 렌더링 확인
    const singleTab = screen.getByRole("tab", { name: /단일 최적 카드/ });
    const portfolioTab = screen.getByRole("tab", { name: /다중 카드 포트폴리오/ });

    expect(singleTab).toBeInTheDocument();
    expect(portfolioTab).toBeInTheDocument();
    expect(screen.getByText("+8,000원")).toBeInTheDocument();

    // 포트폴리오 탭 클릭 시 전환
    fireEvent.click(portfolioTab);
    expect(portfolioTab).toHaveAttribute("aria-selected", "true");
    expect(singleTab).toHaveAttribute("aria-selected", "false");
    expect(screen.getByText("2장 조합")).toBeInTheDocument();
  });

  it("상단 결과 복사 버튼을 누르면 추천 요약이 클립보드에 복사되고 복사 완료 상태로 전환된다", async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardA,
        qualifyingSpend: 400000,
        meetsMinimum: true,
        tierIndex: 0,
        breakdown: [
          { category: "cafe", spend: 100000, benefitAmount: 10000, capped: true },
        ],
        totalMonthlyBenefit: 10000,
        netMonthlyBenefit: 9000,
      },
    ];

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={[{ category: "cafe", bestCard: mockCardA, benefitAmount: 10000 }]}
        categories={mockCategories}
      />,
    );

    const shareBtn = screen.getByTestId("recommendation-header-share-btn");
    expect(shareBtn).toBeInTheDocument();

    fireEvent.click(shareBtn);

    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const copiedText = writeTextMock.mock.calls[0][0];
    expect(copiedText).toContain("신한 마이카페 카드");
    expect(copiedText).toContain("9,000원");

    // 복사 완료 피드백 텍스트 확인
    expect(await screen.findByText("복사 완료!")).toBeInTheDocument();
  });

  it("공유 옵션 버튼을 클릭하면 세부 설정 메뉴가 열리고 개인정보 보호 옵션을 설정할 수 있다", () => {
    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardA,
        qualifyingSpend: 400000,
        meetsMinimum: true,
        tierIndex: 0,
        breakdown: [],
        totalMonthlyBenefit: 10000,
        netMonthlyBenefit: 9000,
      },
    ];

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={[]}
        categories={mockCategories}
      />,
    );

    const optionsBtn = screen.getByTestId("recommendation-header-share-btn-options");
    expect(optionsBtn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(optionsBtn);
    expect(optionsBtn).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "공유 세부 옵션" })).toBeInTheDocument();
    expect(screen.getByText("개인정보 보호 옵션")).toBeInTheDocument();
    expect(screen.getByLabelText("카테고리별 세부 지출액 포함")).toBeInTheDocument();
  });

  it("피킹률 뱃지가 표시되고, 소득공제 토글 활성화 시 절세액과 연봉 설정이 렌더링된다", () => {
    const mockRanked: CardEvaluation[] = [
      {
        card: mockCardB, // 체크카드
        qualifyingSpend: 500000,
        meetsMinimum: true,
        tierIndex: 0,
        breakdown: [
          { category: "transport", spend: 200000, benefitAmount: 8000, capped: true },
        ],
        totalMonthlyBenefit: 8000,
        netMonthlyBenefit: 8000,
      },
    ];

    render(
      <RecommendationResult
        ranked={mockRanked}
        categoryWinners={[]}
        categories={mockCategories}
        monthlySpend={1500000}
      />,
    );

    // 피킹률 뱃지 확인
    const pickingBadge = screen.getByTestId("picking-rate-badge");
    expect(pickingBadge).toBeInTheDocument();
    expect(pickingBadge).toHaveTextContent(/피킹률/);

    // 초기 상태에서는 소득공제 토글 OFF
    const toggle = screen.getByTestId("toggle-tax-savings");
    expect(toggle).not.toBeChecked();
    expect(screen.queryByTestId("tax-savings-cell")).not.toBeInTheDocument();

    // 토글 ON
    fireEvent.click(toggle);
    expect(toggle).toBeChecked();

    // 절세액 셀 및 체크카드 우대 공제 뱃지 렌더링 확인
    expect(screen.getByTestId("tax-savings-cell")).toBeInTheDocument();
    expect(screen.getByText("월 실질 순혜택 (절세 포함)")).toBeInTheDocument();
    expect(screen.getByText("체크 30% 우대 공제")).toBeInTheDocument();

    // 연봉 설정 버튼 확인 및 클릭
    const salaryBtn = screen.getByTestId("salary-setting-btn");
    expect(salaryBtn).toHaveTextContent("5,000만원");
    fireEvent.click(salaryBtn);

    // 연봉 팝오버 렌더링 및 7,000만원 선택
    expect(screen.getByRole("dialog", { name: "총급여 설정" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "7,000만원" }));
    expect(salaryBtn).toHaveTextContent("7,000만원");
  });
});
