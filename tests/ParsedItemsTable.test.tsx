import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ParsedItemsTable } from "@/components/ParsedItemsTable";
import type { Category } from "@/types/card";
import type { ParsedSpendingItem } from "@/lib/importerParser";

const mockCategories: Category[] = [
  { id: "cafe", label: "카페/디저트" },
  { id: "mart", label: "대형마트" },
];

const mockItems: ParsedSpendingItem[] = [
  { merchant: "스타벅스", amount: 10000, category: "cafe" },
  { merchant: "스타벅스 승인취소", amount: -5500, category: "cafe" },
];

describe("ParsedItemsTable 환불/취소 항목 렌더링", () => {
  it("음수 금액 항목에 환불/취소 뱃지와 붉은색 텍스트 스타일이 적용되어야 한다", () => {
    render(
      <ParsedItemsTable
        categories={mockCategories}
        items={mockItems}
        onUpdateItem={vi.fn()}
        onDeleteItem={vi.fn()}
        importMode="merge"
        onImportModeChange={vi.fn()}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />
    );

    // 환불/취소 뱃지 확인
    expect(screen.getByText("환불/취소")).toBeInTheDocument();

    // 상단 안내 메시지 확인
    expect(
      screen.getByText("💡 환불/취소 내역(음수 금액)은 시뮬레이터 적용 시 지출에서 차감됩니다.")
    ).toBeInTheDocument();

    // 음수 금액 인풋 확인
    const amountInputs = screen.getAllByLabelText("금액");
    expect(amountInputs[1]).toHaveValue(-5500);
    expect(amountInputs[1]).toHaveClass("text-rose-600");
  });

  it("금액 수정 시 onUpdateItem이 호출되어야 한다", () => {
    const handleUpdate = vi.fn();
    render(
      <ParsedItemsTable
        categories={mockCategories}
        items={mockItems}
        onUpdateItem={handleUpdate}
        onDeleteItem={vi.fn()}
        importMode="merge"
        onImportModeChange={vi.fn()}
        onCancel={vi.fn()}
        onApply={vi.fn()}
      />
    );

    const amountInputs = screen.getAllByLabelText("금액");
    fireEvent.change(amountInputs[1], { target: { value: "-6000" } });
    expect(handleUpdate).toHaveBeenCalledWith(1, "amount", -6000);
  });
});
