import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import type { CatalogEntry } from "@/types/catalog";
import { useCardComparison } from "@/hooks/useCardComparison";
import { CardComparisonDrawer } from "@/components/catalog/CardComparisonDrawer";
import { CardComparisonModal } from "@/components/catalog/CardComparisonModal";
import { ToastProvider } from "@/contexts/ToastContext";

const mockCard1: CatalogEntry = {
  sourceId: 101,
  sourceUrl: "https://example.com/card1",
  name: "알뜰 할인 카드",
  issuer: "현대카드",
  category: "신용",
  annualFee: 15000,
  annualFeeText: "국내 15,000원",
  benefitSummary: "대중교통 10% 할인\n편의점 5% 할인",
  fetchedAt: "2026-09-01",
};

const mockCard2: CatalogEntry = {
  sourceId: 102,
  sourceUrl: "https://example.com/card2",
  name: "포인트 플래티넘",
  issuer: "신한카드",
  category: "신용",
  annualFee: 30000,
  annualFeeText: "국내외 30,000원",
  benefitSummary: "모든 가맹점 1% 적립\n카페 10% 적립",
  fetchedAt: "2026-09-01",
};

const mockCard3: CatalogEntry = {
  sourceId: 103,
  sourceUrl: "https://example.com/card3",
  name: "심플 체크 카드",
  issuer: "KB국민카드",
  category: "체크",
  annualFee: 0,
  annualFeeText: "연회비 없음",
  benefitSummary: "편의점 3% 캐시백",
  fetchedAt: "2026-09-01",
};

const mockCard4: CatalogEntry = {
  sourceId: 104,
  sourceUrl: "https://example.com/card4",
  name: "프리미엄 블랙",
  issuer: "삼성카드",
  category: "신용",
  annualFee: 100000,
  annualFeeText: "100,000원",
  benefitSummary: "공항 라운지 무료",
  fetchedAt: "2026-09-01",
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe("useCardComparison Hook", () => {
  it("카드를 추가, 중복 토글 제거, 개별 제거할 수 있어야 한다", () => {
    const { result } = renderHook(() => useCardComparison(), { wrapper });

    expect(result.current.selectedCards).toHaveLength(0);
    expect(result.current.isSelected(mockCard1.sourceId)).toBe(false);

    // 카드 1 추가
    act(() => {
      const ok = result.current.toggleCard(mockCard1);
      expect(ok).toBe(true);
    });
    expect(result.current.selectedCards).toHaveLength(1);
    expect(result.current.isSelected(mockCard1.sourceId)).toBe(true);

    // 같은 카드 토글 시 제거
    act(() => {
      const ok = result.current.toggleCard(mockCard1);
      expect(ok).toBe(true);
    });
    expect(result.current.selectedCards).toHaveLength(0);
    expect(result.current.isSelected(mockCard1.sourceId)).toBe(false);

    // 다시 추가 후 removeCard로 제거
    act(() => {
      result.current.toggleCard(mockCard1);
      result.current.toggleCard(mockCard2);
    });
    expect(result.current.selectedCards).toHaveLength(2);

    act(() => {
      result.current.removeCard(mockCard1.sourceId);
    });
    expect(result.current.selectedCards).toHaveLength(1);
    expect(result.current.selectedCards[0].sourceId).toBe(mockCard2.sourceId);
  });

  it("최대 3장까지만 선택할 수 있고 초과 시 추가되지 않아야 한다", () => {
    const { result } = renderHook(() => useCardComparison(), { wrapper });

    act(() => {
      result.current.toggleCard(mockCard1);
      result.current.toggleCard(mockCard2);
      result.current.toggleCard(mockCard3);
    });
    expect(result.current.selectedCards).toHaveLength(3);
    expect(result.current.isMax).toBe(true);

    // 4번째 카드 추가 시도 -> 실패 반환 및 크기 유지
    act(() => {
      const ok = result.current.toggleCard(mockCard4);
      expect(ok).toBe(false);
    });
    expect(result.current.selectedCards).toHaveLength(3);
    expect(result.current.isSelected(mockCard4.sourceId)).toBe(false);
  });

  it("clear 호출 시 모든 선택이 초기화되어야 한다", () => {
    const { result } = renderHook(() => useCardComparison(), { wrapper });

    act(() => {
      result.current.toggleCard(mockCard1);
      result.current.toggleCard(mockCard2);
    });
    expect(result.current.selectedCards).toHaveLength(2);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedCards).toHaveLength(0);
    expect(result.current.isModalOpen).toBe(false);
  });

  it("카드가 2장 미만일 때 openModal을 호출하면 모달이 열리지 않아야 한다", () => {
    const { result } = renderHook(() => useCardComparison(), { wrapper });

    act(() => {
      result.current.toggleCard(mockCard1);
    });
    expect(result.current.selectedCards).toHaveLength(1);

    act(() => {
      result.current.openModal();
    });
    expect(result.current.isModalOpen).toBe(false);

    // 2장 추가 후 openModal
    act(() => {
      result.current.toggleCard(mockCard2);
    });
    act(() => {
      result.current.openModal();
    });
    expect(result.current.isModalOpen).toBe(true);

    // closeModal
    act(() => {
      result.current.closeModal();
    });
    expect(result.current.isModalOpen).toBe(false);
  });
});

describe("CardComparisonDrawer Component", () => {
  it("선택된 카드가 없으면 렌더링되지 않아야 한다", () => {
    const { container } = render(
      <CardComparisonDrawer
        selectedCards={[]}
        onRemoveCard={vi.fn()}
        onClear={vi.fn()}
        onOpenModal={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("1장 선택 시 비교하기 버튼이 비활성화 상태여야 한다", () => {
    const handleOpenModal = vi.fn();
    render(
      <CardComparisonDrawer
        selectedCards={[mockCard1]}
        onRemoveCard={vi.fn()}
        onClear={vi.fn()}
        onOpenModal={handleOpenModal}
      />,
    );

    expect(screen.getByText("알뜰 할인 카드")).toBeInTheDocument();
    expect(screen.getByText(/비교하려면 1장 이상 더 담아주세요/)).toBeInTheDocument();

    const compareButton = screen.getByRole("button", { name: /비교하기/ });
    expect(compareButton).toBeDisabled();

    fireEvent.click(compareButton);
    expect(handleOpenModal).not.toHaveBeenCalled();
  });

  it("2장 선택 시 비교하기 버튼이 활성화되고 클릭 시 onOpenModal이 호출되어야 한다", () => {
    const handleOpenModal = vi.fn();
    render(
      <CardComparisonDrawer
        selectedCards={[mockCard1, mockCard2]}
        onRemoveCard={vi.fn()}
        onClear={vi.fn()}
        onOpenModal={handleOpenModal}
      />,
    );

    const compareButton = screen.getByRole("button", { name: /비교하기 \(2종\)/ });
    expect(compareButton).not.toBeDisabled();

    fireEvent.click(compareButton);
    expect(handleOpenModal).toHaveBeenCalledTimes(1);
  });

  it("개별 삭제 버튼 및 전체 비우기 버튼 클릭 시 콜백이 실행되어야 한다", () => {
    const handleRemove = vi.fn();
    const handleClear = vi.fn();

    render(
      <CardComparisonDrawer
        selectedCards={[mockCard1, mockCard2]}
        onRemoveCard={handleRemove}
        onClear={handleClear}
        onOpenModal={vi.fn()}
      />,
    );

    const removeBtn = screen.getByLabelText(`${mockCard1.name} 비교함에서 제거`);
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledWith(mockCard1.sourceId);

    const clearButtons = screen.getAllByRole("button", { name: "전체 비우기" });
    fireEvent.click(clearButtons[0]);
    expect(handleClear).toHaveBeenCalled();
  });
});

describe("CardComparisonModal Component", () => {
  it("isOpen=false이면 아무것도 렌더링하지 않아야 한다", () => {
    const { container } = render(
      <CardComparisonModal
        isOpen={false}
        cards={[mockCard1, mockCard2]}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("isOpen=true일 때 선택된 카드들의 대조 정보가 정상 렌더링되어야 한다", () => {
    const handleClose = vi.fn();
    const handleToggleMyCards = vi.fn();
    const handleRemoveCard = vi.fn();

    render(
      <CardComparisonModal
        isOpen={true}
        cards={[mockCard1, mockCard2]}
        onClose={handleClose}
        inMyCards={(id) => id === mockCard1.sourceId}
        onToggleMyCards={handleToggleMyCards}
        onRemoveCard={handleRemoveCard}
      />,
    );

    // 모달 제목 및 카드 정보 확인
    expect(screen.getByRole("heading", { name: "관심 카드 혜택 및 연회비 비교" })).toBeInTheDocument();
    expect(screen.getByText("알뜰 할인 카드")).toBeInTheDocument();
    expect(screen.getByText("포인트 플래티넘")).toBeInTheDocument();

    // 연회비 정보 확인
    expect(screen.getByText("15,000원")).toBeInTheDocument();
    expect(screen.getByText("30,000원")).toBeInTheDocument();

    // 내 카드 보관 상태 버튼 확인
    expect(screen.getByText("내 카드 담김 ✓")).toBeInTheDocument();
    const addMyCardBtn = screen.getByText("+ 내 카드 담기");
    expect(addMyCardBtn).toBeInTheDocument();

    fireEvent.click(addMyCardBtn);
    expect(handleToggleMyCards).toHaveBeenCalledWith(mockCard2);

    // 카드 제외 버튼 클릭
    const excludeButtons = screen.getAllByText("제외");
    fireEvent.click(excludeButtons[0]);
    expect(handleRemoveCard).toHaveBeenCalledWith(mockCard1.sourceId);

    // 닫기 버튼 클릭
    const closeButtons = screen.getAllByRole("button", { name: /닫기/ });
    fireEvent.click(closeButtons[0]);
    expect(handleClose).toHaveBeenCalled();
  });

  it("Escape 키 입력 시 onClose가 호출되어야 한다", () => {
    const handleClose = vi.fn();
    render(
      <CardComparisonModal
        isOpen={true}
        cards={[mockCard1, mockCard2]}
        onClose={handleClose}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
