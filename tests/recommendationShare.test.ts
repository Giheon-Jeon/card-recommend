import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatSingleRecommendationSummary,
  formatPortfolioRecommendationSummary,
  copyTextToClipboard,
  shareOrCopyRecommendation,
} from "@/lib/recommendationShare";
import type { Category, Card } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import type { PortfolioRecommendation } from "@/types/portfolio";

const mockCategories: Category[] = [
  { id: "dining", label: "외식/배달" },
  { id: "cafe", label: "카페" },
  { id: "transit", label: "대중교통" },
];

const mockCard1: Card = {
  id: "card-1",
  name: "신한카드 Mr.Life",
  issuer: "신한카드",
  cardType: "credit",
  annualFee: 15000,
  baseRewardRate: 0.01,
  rewardTiers: [
    {
      minSpend: 300000,
      rewards: [
        { category: "dining", rate: 0.1, monthlyCap: 10000 },
        { category: "cafe", rate: 0.1, monthlyCap: 10000 },
      ],
    },
  ],
};

const mockCard2: Card = {
  id: "card-2",
  name: "알뜰교통카드",
  issuer: "KB국민카드",
  cardType: "credit",
  annualFee: 12000,
  baseRewardRate: 0.005,
  rewardTiers: [
    {
      minSpend: 300000,
      rewards: [{ category: "transit", rate: 0.15, monthlyCap: 15000 }],
    },
  ],
};

const mockTopEvaluation: CardEvaluation = {
  card: mockCard1,
  qualifyingSpend: 500000,
  meetsMinimum: true,
  tierIndex: 0,
  breakdown: [
    { category: "dining", spend: 200000, benefitAmount: 10000, capped: true },
    { category: "cafe", spend: 100000, benefitAmount: 10000, capped: false },
  ],
  totalMonthlyBenefit: 20000,
  netMonthlyBenefit: 18750,
};

const mockCategoryWinners: CategoryWinner[] = [
  { category: "dining", bestCard: mockCard1, benefitAmount: 10000 },
  { category: "transit", bestCard: mockCard2, benefitAmount: 8000 },
];

const mockPortfolio: PortfolioRecommendation = {
  combinationSize: 2,
  cards: [mockCard1, mockCard2],
  totalSpend: 700000,
  totalMonthlyBenefit: 28000,
  totalAnnualFee: 27000,
  netMonthlyBenefit: 25750,
  benefitIncreaseVsSingle: 7000,
  cardAllocations: [
    {
      card: mockCard1,
      allocatedSpend: 400000,
      qualifyingSpend: 400000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 18000,
      annualFee: 15000,
      netMonthlyBenefit: 16750,
      assignedCategories: ["dining", "cafe"],
    },
    {
      card: mockCard2,
      allocatedSpend: 300000,
      qualifyingSpend: 300000,
      meetsMinimum: true,
      tierIndex: 0,
      monthlyBenefit: 10000,
      annualFee: 12000,
      netMonthlyBenefit: 9000,
      assignedCategories: ["transit"],
    },
  ],
  categoryAssignments: [
    {
      category: "dining",
      assignedCard: mockCard1,
      spend: 250000,
      benefitAmount: 10000,
      rate: 0.1,
    },
    {
      category: "transit",
      assignedCard: mockCard2,
      spend: 100000,
      benefitAmount: 8000,
      rate: 0.15,
    },
  ],
};

describe("recommendationShare 유틸리티", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("formatSingleRecommendationSummary", () => {
    it("단일 1위 카드 혜택 요약 텍스트를 올바르게 구성한다", () => {
      const summary = formatSingleRecommendationSummary(
        mockTopEvaluation,
        mockCategoryWinners,
        mockCategories,
      );

      expect(summary).toContain("💳 [카드 혜택 추천 결과]");
      expect(summary).toContain("🥇 1위 추천 카드: 신한카드 Mr.Life (신한카드 · 신용카드)");
      expect(summary).toContain("• 월 순혜택 (연회비 차감): 18,750원");
      expect(summary).toContain("• 월 총 혜택: +20,000원");
      expect(summary).toContain("• 연회비: 15,000원");
      expect(summary).toContain("• 전월실적 인정금액: 500,000원");
      expect(summary).toContain("📌 카테고리별 최적 카드");
      expect(summary).toContain("• 외식/배달: 신한카드 Mr.Life (+10,000원)");
      expect(summary).toContain("• 대중교통: 알뜰교통카드 (+8,000원)");
      // 기본적으로 세부 지출액은 미포함
      expect(summary).not.toContain("월 지출 200,000원");
    });

    it("includeSpendDetails 옵션이 활성화되면 세부 지출액이 포함된다", () => {
      const summary = formatSingleRecommendationSummary(
        mockTopEvaluation,
        mockCategoryWinners,
        mockCategories,
        { includeSpendDetails: true },
      );

      expect(summary).toContain("월 지출 200,000원");
    });
  });

  describe("formatPortfolioRecommendationSummary", () => {
    it("포트폴리오 조합 텍스트 요약을 올바르게 구성한다", () => {
      const summary = formatPortfolioRecommendationSummary(mockPortfolio, mockCategories);

      expect(summary).toContain("🎯 [AI 최적 카드 포트폴리오 (2장 조합)]");
      expect(summary).toContain("✨ 월 순혜택: 25,750원 (단일 1위 대비 +7,000원 추가 이득)");
      expect(summary).toContain("• 월 총 혜택: +28,000원");
      expect(summary).toContain("• 합산 연회비: 27,000원");
      expect(summary).toContain("💳 추천 조합 카드 (2장)");
      expect(summary).toContain("1. 신한카드 Mr.Life (신한카드): 월 +18,000원");
      expect(summary).toContain("2. 알뜰교통카드 (KB국민카드): 월 +10,000원");
      expect(summary).toContain("📋 카테고리별 추천 결제 카드 배분표");
      expect(summary).toContain("• 외식/배달: 신한카드 Mr.Life (혜택률 10.0%, 예상 혜택 +10,000원)");
      expect(summary).toContain("• 대중교통: 알뜰교통카드 (혜택률 15.0%, 예상 혜택 +8,000원)");
      expect(summary).not.toContain("월 지출 250,000원");
    });

    it("includeSpendDetails 옵션 활성화 시 분석 지출 총액 및 개별 지출이 포함된다", () => {
      const summary = formatPortfolioRecommendationSummary(mockPortfolio, mockCategories, {
        includeSpendDetails: true,
      });

      expect(summary).toContain("• 분석 월 지출 총액: 700,000원");
      expect(summary).toContain("지출 배분 400,000원");
      expect(summary).toContain("월 지출 250,000원");
    });
  });

  describe("copyTextToClipboard", () => {
    it("navigator.clipboard.writeText가 지원되는 경우 성공적으로 복사한다", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const result = await copyTextToClipboard("테스트 복사 내용");
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("테스트 복사 내용");
    });

    it("navigator.clipboard가 실패할 경우 textarea execCommand fallback을 사용한다", async () => {
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: vi.fn().mockRejectedValue(new Error("Permission denied")) },
        configurable: true,
        writable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      const result = await copyTextToClipboard("대체 복사 내용");
      expect(result).toBe(true);
      expect(execCommandMock).toHaveBeenCalledWith("copy");
    });
  });

  describe("shareOrCopyRecommendation", () => {
    it("navigator.share가 사용 가능한 환경에서는 모바일 공유 시트를 호출한다", async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "share", {
        value: shareMock,
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
        writable: true,
      });

      const res = await shareOrCopyRecommendation({
        title: "추천 결과",
        text: "공유 내용",
      });

      expect(res.action).toBe("share");
      expect(res.success).toBe(true);
      expect(shareMock).toHaveBeenCalled();
    });

    it("사용자가 공유 시트를 취소(AbortError)한 경우 canceled 플래그를 반환한다", async () => {
      const abortError = new Error("Abort");
      abortError.name = "AbortError";
      Object.defineProperty(navigator, "share", {
        value: vi.fn().mockRejectedValue(abortError),
        configurable: true,
        writable: true,
      });
      Object.defineProperty(navigator, "canShare", {
        value: vi.fn().mockReturnValue(true),
        configurable: true,
        writable: true,
      });

      const res = await shareOrCopyRecommendation({
        title: "추천 결과",
        text: "공유 내용",
      });

      expect(res.action).toBe("share");
      expect(res.success).toBe(false);
      expect(res.canceled).toBe(true);
    });

    it("navigator.share가 없는 환경에서는 클립보드 복사로 대체된다", async () => {
      Object.defineProperty(navigator, "share", {
        value: undefined,
        configurable: true,
        writable: true,
      });
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, "clipboard", {
        value: { writeText: writeTextMock },
        configurable: true,
        writable: true,
      });

      const res = await shareOrCopyRecommendation({
        title: "추천 결과",
        text: "공유 내용",
      });

      expect(res.action).toBe("clipboard");
      expect(res.success).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith("공유 내용");
    });
  });
});
