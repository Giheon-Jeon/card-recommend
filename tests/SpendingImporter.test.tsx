import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SpendingImporter } from "@/components/SpendingImporter";
import { SimulatorPage } from "@/components/SimulatorPage";
import type { Category } from "@/types/card";

const mockCategories: Category[] = [
  { id: "transport", label: "대중교통" },
  { id: "mart", label: "마트" },
];

describe("SpendingImporter and SimulatorPage ErrorBoundary integration", () => {
  it("SpendingImporter가 정상적으로 렌더링되어야 한다", () => {
    render(
      <SpendingImporter
        categories={mockCategories}
        onImport={vi.fn()}
      />
    );

    expect(screen.getByText("외부 지출 내역 가져오기")).toBeInTheDocument();
    expect(screen.getByText("체험용 데모")).toBeInTheDocument();
    expect(screen.getByText("결제 내역 텍스트")).toBeInTheDocument();
    expect(screen.getByText("영수증 이미지")).toBeInTheDocument();
  });

  it("SimulatorPage 내에서 SpendingImporter에 오류가 발생해도 ErrorBoundary가 포착하여 나머지 시뮬레이터 UI를 보호한다", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // SimulatorPage는 myCards가 비어있지 않아야 SpendingImporter와 SpendingSimulator를 렌더링함
    const mockMyCards = {
      ids: ["card-1"],
      addCard: vi.fn(),
      removeCard: vi.fn(),
      toggleCard: vi.fn(),
      hasCard: vi.fn().mockReturnValue(true),
      clearCards: vi.fn(),
    };

    render(
      <SimulatorPage
        myCards={mockMyCards}
        onGoToGallery={vi.fn()}
      />
    );

    // 지출 내역 가져오기 및 월 지출 시뮬레이터가 함께 존재하는지 확인
    expect(screen.getByText("외부 지출 내역 가져오기")).toBeInTheDocument();
    expect(screen.getByText("월 지출 시뮬레이터")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
