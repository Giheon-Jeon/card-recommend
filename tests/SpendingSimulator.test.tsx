import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import type { Category, SpendingProfile } from "@/types/card";

describe("SpendingSimulator Component Smoke Test", () => {
  const mockCategories: Category[] = [
    { id: "transport", label: "대중교통" },
    { id: "mart", label: "마트" },
  ];

  const mockSpending: SpendingProfile = {
    transport: 120000,
    mart: 350000,
  };

  const mockOnChange = vi.fn();

  it("헤더, 카테고리 정보, 슬라이더, 숫자 입력창 및 퀵 입력 버튼들이 올바르게 렌더링되어야 한다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={mockSpending}
        onChange={mockOnChange}
      />
    );

    // 컴포넌트 타이틀 확인
    expect(screen.getByText("월 지출 시뮬레이터")).toBeInTheDocument();

    // 합계 지출액 렌더링 확인 (120,000 + 350,000 = 470,000원)
    expect(screen.getByText("470,000원")).toBeInTheDocument();

    // 카테고리 텍스트 확인
    expect(screen.getByText("대중교통")).toBeInTheDocument();
    expect(screen.getByText("마트")).toBeInTheDocument();

    // 퀵 스텝 5만 버튼 확인
    const quickButtons = screen.getAllByRole("button", { name: "5만" });
    expect(quickButtons.length).toBe(2);
  });

  it("슬라이더(range) 값을 변경할 때 onChange 핸들러가 올바르게 호출되어야 한다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={mockSpending}
        onChange={mockOnChange}
      />
    );

    const rangeInputs = screen.getAllByRole("slider");
    expect(rangeInputs.length).toBe(2);

    fireEvent.change(rangeInputs[0], { target: { value: "150000" } });
    expect(mockOnChange).toHaveBeenCalledWith("transport", 150000);
  });

  it("수치 입력창(number) 값을 변경할 때 onChange 핸들러가 올바르게 호출되어야 한다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={mockSpending}
        onChange={mockOnChange}
      />
    );

    const numberInputs = screen.getAllByRole("spinbutton");
    expect(numberInputs.length).toBe(2);

    fireEvent.change(numberInputs[1], { target: { value: "400000" } });
    expect(mockOnChange).toHaveBeenCalledWith("mart", 400000);
  });

  it("퀵 버튼 클릭 시 onChange 핸들러가 올바르게 호출되어야 한다", () => {
    render(
      <SpendingSimulator
        categories={mockCategories}
        spending={mockSpending}
        onChange={mockOnChange}
      />
    );

    const quickButtons = screen.getAllByRole("button", { name: "10만" });
    fireEvent.click(quickButtons[0]);
    expect(mockOnChange).toHaveBeenCalledWith("transport", 100000);
  });
});
