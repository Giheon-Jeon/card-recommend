import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerformanceProgressTracker } from "@/components/catalog/PerformanceProgressTracker";
import axe from "axe-core";

describe("PerformanceProgressTracker", () => {
  it("최소 실적 미달성 시 '미달성' 뱃지와 남은 금액 안내 문구를 렌더링한다", () => {
    render(
      <PerformanceProgressTracker
        currentSpend={100000}
        tiers={[300000, 700000, 1000000]}
        cardName="신한카드 Hi-Point"
      />,
    );

    const badge = screen.getByTestId("performance-status-badge");
    expect(badge).toHaveTextContent("미달성");

    const helper = screen.getByTestId("performance-helper-text");
    expect(helper).toHaveTextContent("최소 실적까지 200,000원 남음");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "10");
    expect(progressbar).toHaveAttribute(
      "aria-label",
      "신한카드 Hi-Point 전월 실적 달성률",
    );
  });

  it("중간 실적 달성 시 '달성' 뱃지와 다음 구간 잔여액 문구를 렌더링한다", () => {
    render(
      <PerformanceProgressTracker
        currentSpend={500000}
        tiers={[300000, 700000, 1000000]}
        cardName="테스트 카드"
      />,
    );

    const badge = screen.getByTestId("performance-status-badge");
    expect(badge).toHaveTextContent("달성");

    const helper = screen.getByTestId("performance-helper-text");
    expect(helper).toHaveTextContent("다음 혜택 구간까지 200,000원 남음");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "50");
  });

  it("최고 실적 달성 시 '최대 혜택' 뱃지와 축하 문구를 렌더링한다", () => {
    render(
      <PerformanceProgressTracker
        currentSpend={1200000}
        tiers={[300000, 700000, 1000000]}
        cardName="테스트 카드"
      />,
    );

    const badge = screen.getByTestId("performance-status-badge");
    expect(badge).toHaveTextContent("최대 혜택");

    const helper = screen.getByTestId("performance-helper-text");
    expect(helper).toHaveTextContent("최고 혜택 구간 달성 완료 🎉");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
  });

  it("실적 조건이 없는 경우 '실적 조건 없음'과 100%를 렌더링한다", () => {
    render(
      <PerformanceProgressTracker
        currentSpend={50000}
        tiers={[]}
        cardName="무실적 카드"
      />,
    );

    const badge = screen.getByTestId("performance-status-badge");
    expect(badge).toHaveTextContent("실적 조건 없음");

    const helper = screen.getByTestId("performance-helper-text");
    expect(helper).toHaveTextContent("전월 실적 조건 없이 혜택 제공");

    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");
  });

  it("실적이 부족하고 currentDate가 주어졌을 때 D-Day 뱃지와 일평균 권장 소비액을 렌더링한다", () => {
    render(
      <PerformanceProgressTracker
        currentSpend={225000}
        tiers={[300000, 700000]}
        cardName="테스트 카드"
        currentDate="2026-10-28" // 31 - 28 = 3일 남음, 잔여 4일
      />,
    );

    // 300,000 - 225,000 = 75,000원 부족
    // 잔여 4일 -> 75,000 / 4 = 18,750원
    const ddayBadge = screen.getByTestId("performance-dday-badge");
    expect(ddayBadge).toHaveTextContent("말일 D-3");

    const dailyHighlight = screen.getByTestId(
      "performance-daily-spend-highlight",
    );
    expect(dailyHighlight).toHaveTextContent("18,750원 소비 권장");
  });

  it("카드 정보가 주어지면 부족 실적을 채우기 위한 최고 혜택 카테고리 소비 추천 팁을 렌더링한다", () => {
    const mockCard = {
      sourceId: 501,
      sourceUrl: "https://example.com",
      name: "할인 마스터 카드",
      issuer: "국민카드",
      category: "신용",
      benefitSummary: "카페/디저트 10% 할인, 편의점 5% 적립",
      performanceStandard: "전월 30만원 이상",
      fetchedAt: "2026-10-01",
    };

    render(
      <PerformanceProgressTracker
        currentSpend={200000}
        tiers={[300000]}
        cardName={mockCard.name}
        card={mockCard}
        currentDate="2026-10-25"
      />,
    );

    const tipBox = screen.getByTestId("spending-recommendation-tip");
    expect(tipBox).toBeInTheDocument();
    expect(tipBox).toHaveTextContent("실적 채우기 팁:");
    expect(tipBox).toHaveTextContent("카페/디저트");
    expect(tipBox).toHaveTextContent("10% 할인");
  });

  it("axe 접근성 자동 검사를 통과해야 한다 (WCAG 준수)", async () => {
    const { container } = render(
      <PerformanceProgressTracker
        currentSpend={450000}
        tiers={[300000, 700000, 1000000]}
        cardName="접근성 테스트 카드"
        currentDate="2026-10-28"
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
