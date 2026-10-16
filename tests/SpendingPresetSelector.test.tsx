import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SpendingPresetSelector } from "@/components/SpendingPresetSelector";
import { SPENDING_PRESETS } from "@/lib/spendingPresets";
import { ToastProvider } from "@/contexts/ToastContext";
import type { Category, SpendingProfile } from "@/types/card";

const TEST_CATEGORIES: Category[] = [
  { id: "convenience", label: "편의점" },
  { id: "cafe", label: "카페/디저트" },
  { id: "transport", label: "대중교통" },
  { id: "mobile", label: "통신비" },
  { id: "onlineShopping", label: "온라인쇼핑" },
  { id: "mart", label: "대형마트/슈퍼" },
  { id: "dining", label: "외식" },
  { id: "culture", label: "영화/공연/OTT" },
  { id: "gas", label: "주유" },
  { id: "etc", label: "그 외 일반가맹점" },
];

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>);
}

describe("SpendingPresetSelector", () => {
  const mockOnApplyPreset = vi.fn();

  beforeEach(() => {
    mockOnApplyPreset.mockClear();
  });

  it("5종의 라이프스타일 프리셋 버튼과 뱃지, 설명이 올바르게 렌더링되어야 한다", () => {
    const emptySpending: SpendingProfile = {};
    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={emptySpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    expect(screen.getByText("라이프스타일 원클릭 지출 프리셋")).toBeInTheDocument();

    SPENDING_PRESETS.forEach((preset) => {
      expect(screen.getByText(preset.name)).toBeInTheDocument();
      expect(screen.getByText(preset.badge)).toBeInTheDocument();
    });
  });

  it("지출 입력값이 없을 때 프리셋을 클릭하면 확인 모달 없이 즉시 onApplyPreset이 호출되고 성공 토스트가 표시된다", () => {
    const emptySpending: SpendingProfile = { transport: 0, mart: 0 };
    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={emptySpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const singlePresetButton = screen.getByRole("button", {
      name: /1인 가구 자취생 프리셋 선택/i,
    });
    fireEvent.click(singlePresetButton);

    expect(mockOnApplyPreset).toHaveBeenCalledTimes(1);
    expect(mockOnApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: "single", name: "1인 가구 자취생" }),
    );
    expect(screen.getByText(/'1인 가구 자취생' 프리셋이 적용되었습니다/i)).toBeInTheDocument();
  });

  it("이미 해당 프리셋과 동일한 값이 설정되어 있으면 안내 토스트를 띄우고 중복 적용하지 않는다", () => {
    const singlePreset = SPENDING_PRESETS.find((p) => p.id === "single")!;
    const spendingWithSingle: SpendingProfile = { ...singlePreset.profile };

    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={spendingWithSingle}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const singleButton = screen.getByRole("button", {
      name: /1인 가구 자취생 프리셋 선택/i,
    });
    expect(singleButton).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(singleButton);
    expect(mockOnApplyPreset).not.toHaveBeenCalled();
    expect(screen.getByText(/이미 '1인 가구 자취생' 프리셋이 적용되어 있습니다/i)).toBeInTheDocument();
  });

  it("기존 입력 지출액이 있을 때 다른 프리셋을 클릭하면 덮어쓰기 확인 대화상자가 표시된다", () => {
    const existingSpending: SpendingProfile = {
      transport: 150000,
      mart: 300000,
    };

    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={existingSpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const commuterButton = screen.getByRole("button", {
      name: /직장인 통근러 프리셋 선택/i,
    });
    fireEvent.click(commuterButton);

    // 모달이 노출되고 onApplyPreset은 아직 호출되지 않음
    expect(mockOnApplyPreset).not.toHaveBeenCalled();
    expect(screen.getByText("지출 프로필 덮어쓰기 확인")).toBeInTheDocument();
    expect(screen.getByText(/현재 입력된 예상 월 지출액/)).toBeInTheDocument();
    expect(screen.getByText(/선택한 프리셋:/)).toBeInTheDocument();
    expect(screen.getAllByText(/직장인 통근러/).length).toBeGreaterThanOrEqual(2);
  });

  it("덮어쓰기 모달에서 취소를 누르면 onApplyPreset이 호출되지 않고 모달이 닫힌다", () => {
    const existingSpending: SpendingProfile = { transport: 100000 };

    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={existingSpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const commuterButton = screen.getByRole("button", {
      name: /직장인 통근러 프리셋 선택/i,
    });
    fireEvent.click(commuterButton);

    const cancelBtn = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelBtn);

    expect(mockOnApplyPreset).not.toHaveBeenCalled();
    expect(screen.queryByText("지출 프로필 덮어쓰기 확인")).not.toBeInTheDocument();
  });

  it("덮어쓰기 모달에서 덮어쓰기 적용을 누르면 onApplyPreset이 호출되고 모달이 닫힌다", () => {
    const existingSpending: SpendingProfile = { transport: 100000 };

    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={existingSpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const commuterButton = screen.getByRole("button", {
      name: /직장인 통근러 프리셋 선택/i,
    });
    fireEvent.click(commuterButton);

    const confirmBtn = screen.getByRole("button", { name: "덮어쓰기 적용" });
    fireEvent.click(confirmBtn);

    expect(mockOnApplyPreset).toHaveBeenCalledTimes(1);
    expect(mockOnApplyPreset).toHaveBeenCalledWith(
      expect.objectContaining({ id: "commuter", name: "직장인 통근러" }),
    );
    expect(screen.queryByText("지출 프로필 덮어쓰기 확인")).not.toBeInTheDocument();
    expect(screen.getByText(/'직장인 통근러' 프리셋이 적용되었습니다/i)).toBeInTheDocument();
  });

  it("덮어쓰기 모달이 열려 있을 때 Escape 키를 누르면 모달이 닫힌다", async () => {
    const existingSpending: SpendingProfile = { transport: 100000 };

    renderWithToast(
      <SpendingPresetSelector
        categories={TEST_CATEGORIES}
        spending={existingSpending}
        onApplyPreset={mockOnApplyPreset}
      />,
    );

    const shopperButton = screen.getByRole("button", {
      name: /카페·쇼핑 매니아 프리셋 선택/i,
    });
    fireEvent.click(shopperButton);

    expect(screen.getByText("지출 프로필 덮어쓰기 확인")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByText("지출 프로필 덮어쓰기 확인")).not.toBeInTheDocument();
    });
    expect(mockOnApplyPreset).not.toHaveBeenCalled();
  });
});
