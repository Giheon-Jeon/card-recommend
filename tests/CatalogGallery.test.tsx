import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CatalogGallery } from "@/components/catalog/CatalogGallery";

describe("CatalogGallery Component Smoke Test", () => {
  const mockMyCards = {
    ids: [1, 2],
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    has: vi.fn((id: number) => id === 1),
  };

  it("검색 입력창, 필터 셀렉트 박스, 카드 목록이 올바르게 렌더링되어야 한다", () => {
    render(<CatalogGallery myCards={mockMyCards} />);

    // 검색 입력창 확인
    const searchInput = screen.getByPlaceholderText("카드 이름 또는 카드사로 검색");
    expect(searchInput).toBeInTheDocument();

    // 필터용 셀렉트 박스 확인
    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBe(2);

    // 정보 부족 카드 제외 버튼 확인
    const filterButton = screen.getByRole("button", { name: /정보 부족 카드 제외/ });
    expect(filterButton).toBeInTheDocument();

    // 총 카드 수 안내 텍스트 확인
    const totalCountText = screen.getByText(/총/);
    expect(totalCountText).toBeInTheDocument();
  });

  it("검색어 입력 시 입력값이 정상적으로 반영되어야 한다", () => {
    render(<CatalogGallery myCards={mockMyCards} />);
    const searchInput = screen.getByPlaceholderText("카드 이름 또는 카드사로 검색") as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: "신한" } });
    expect(searchInput.value).toBe("신한");
  });
});
