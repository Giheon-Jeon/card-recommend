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

  it("axe 접근성 자동 검사를 통과해야 한다 (WCAG 준수)", async () => {
    const { container } = render(
      <PerformanceProgressTracker
        currentSpend={450000}
        tiers={[300000, 700000, 1000000]}
        cardName="접근성 테스트 카드"
      />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});
