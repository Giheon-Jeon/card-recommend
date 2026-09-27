/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import type { Category, SpendingProfile } from "@/types/card";

const mockCategories: Category[] = [
  { id: "transport", label: "대중교통" },
  { id: "cafe", label: "카페" },
  { id: "mart", label: "마트" },
];

describe("SpendingSimulator 컴포넌트", () => {
  const initialSpending: SpendingProfile = {
    transport: 50000,
    cafe: 20000,
    mart: 0,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("카테고리 라벨과 초기 지출 금액, 총 월 지출액이 올바르게 렌더링된다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText("월 지출 시뮬레이터")).toBeDefined();
    expect(screen.getByText("대중교통")).toBeDefined();
    expect(screen.getByText("카페")).toBeDefined();
    expect(screen.getByText("마트")).toBeDefined();
    // 50000 + 20000 + 0 = 70,000원
    expect(screen.getByText("70,000원")).toBeDefined();
  });

  it("슬라이더 변경 시 onChange 콜백이 올바른 값과 함께 호출된다", () => {
    const handleChange = vi.fn();
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={handleChange}
      />,
    );

    const slider = screen.getByLabelText("대중교통 지출 슬라이더");
    fireEvent.change(slider, { target: { value: "80000" } });

    expect(handleChange).toHaveBeenCalledWith("transport", 80000);
  });

  it("숫자 입력 필드 변경 시 onChange 콜백이 호출된다", () => {
    const handleChange = vi.fn();
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={handleChange}
      />,
    );

    const input = screen.getByLabelText("카페 지출 금액 입력");
    fireEvent.change(input, { target: { value: "35000" } });

    expect(handleChange).toHaveBeenCalledWith("cafe", 35000);
  });

  it("빠른 입력 버튼 클릭 시 해당 금액으로 onChange가 호출된다", () => {
    const handleChange = vi.fn();
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={handleChange}
      />,
    );

    const quickButtons = screen.getAllByRole("button", { name: "10만" });
    fireEvent.click(quickButtons[0]);

    expect(handleChange).toHaveBeenCalledWith("transport", 100000);
  });

  it("onReset prop이 주어지면 전체 초기화 버튼이 렌더링된다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={vi.fn()}
        onReset={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: /전체 초기화/i })).toBeDefined();
  });

  it("전체 초기화 버튼 클릭 시 confirm 확인 시 onReset이 실행된다", () => {
    const handleReset = vi.fn();
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={vi.fn()}
        onReset={handleReset}
      />,
    );

    const resetButton = screen.getByRole("button", { name: /전체 초기화/i });
    fireEvent.click(resetButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleReset).toHaveBeenCalledTimes(1);

    window.confirm = originalConfirm;
  });

  it("전체 초기화 버튼 클릭 시 confirm 취소 시 onReset이 실행되지 않는다", () => {
    const handleReset = vi.fn();
    const originalConfirm = window.confirm;
    window.confirm = vi.fn().mockReturnValue(false);

    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={initialSpending}
        onChange={vi.fn()}
        onReset={handleReset}
      />,
    );

    const resetButton = screen.getByRole("button", { name: /전체 초기화/i });
    fireEvent.click(resetButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(handleReset).not.toHaveBeenCalled();

    window.confirm = originalConfirm;
  });

  it("지출 금액이 100만원을 초과하면 슬라이더 최대 한도가 동적으로 확장된다", () => {
    const highSpending = { ...initialSpending, transport: 1500000 };
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={highSpending}
        onChange={vi.fn()}
      />,
    );

    const slider = screen.getByLabelText("대중교통 지출 슬라이더");
    expect(slider.getAttribute("max")).toBe("3000000");
    expect(screen.getByText("최대 300만")).toBeDefined();
  });
});
