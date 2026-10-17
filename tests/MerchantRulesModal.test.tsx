import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { MerchantRulesModal } from "@/components/MerchantRulesModal";
import { ToastProvider } from "@/contexts/ToastContext";
import {
  saveStoredMerchantRules,
  getStoredMerchantRules,
  type CustomMerchantRule,
} from "@/lib/merchantRules";
import type { Category } from "@/types/card";

describe("MerchantRulesModal 컴포넌트 단위 및 인터랙션 테스트", () => {
  const dummyCategories: Category[] = [
    { id: "dining", label: "외식" },
    { id: "cafe", label: "카페/디저트" },
    { id: "mart", label: "대형마트/슈퍼" },
    { id: "convenience", label: "편의점" },
    { id: "etc", label: "기타" },
  ];

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderModal = (isOpen = true, onClose = vi.fn()) => {
    return render(
      <ToastProvider>
        <MerchantRulesModal
          isOpen={isOpen}
          onClose={onClose}
          categories={dummyCategories}
        />
      </ToastProvider>
    );
  };

  it("isOpen=false일 경우 렌더링되지 않아야 한다", () => {
    renderModal(false);
    expect(screen.queryByText("가맹점 자동 분류 규칙 사전")).not.toBeInTheDocument();
  });

  it("isOpen=true일 경우 모달 헤더와 등록 폼이 올바르게 렌더링되어야 한다", () => {
    renderModal(true);
    expect(screen.getByText("가맹점 자동 분류 규칙 사전")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/가맹점 키워드/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "추가" })).toBeInTheDocument();
  });

  it("새로운 가맹점 분류 규칙을 입력하고 추가할 수 있어야 한다", async () => {
    renderModal(true);

    const input = screen.getByPlaceholderText(/가맹점 키워드/);
    const addButton = screen.getByRole("button", { name: "추가" });

    fireEvent.change(input, { target: { value: "동네단골식당" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText("동네단골식당")).toBeInTheDocument();
    });

    const stored = getStoredMerchantRules();
    expect(stored.some((r) => r.keyword === "동네단골식당")).toBe(true);
  });

  it("키워드가 비어 있으면 유효성 검사 에러 메시지가 표시되어야 한다", () => {
    renderModal(true);
    const addButton = screen.getByRole("button", { name: "추가" });

    fireEvent.click(addButton);
    expect(screen.getByText("키워드를 입력해 주세요.")).toBeInTheDocument();
  });

  it("이미 등록된 키워드를 다시 추가하려 하면 중복 에러가 표시되어야 한다", async () => {
    const existing: CustomMerchantRule[] = [
      { id: "1", keyword: "기존상점", category: "dining", createdAt: 1 },
    ];
    saveStoredMerchantRules(existing);

    renderModal(true);

    const input = screen.getByPlaceholderText(/가맹점 키워드/);
    const addButton = screen.getByRole("button", { name: "추가" });

    fireEvent.change(input, { target: { value: "기존상점" } });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText(/이미 등록된 키워드입니다/)).toBeInTheDocument();
    });
  });

  it("등록된 규칙의 수정 버튼을 눌러 인라인 수정 후 저장이 가능해야 한다", async () => {
    saveStoredMerchantRules([
      { id: "edit-test-1", keyword: "수정전가맹점", category: "dining", createdAt: 1 },
    ]);

    renderModal(true);
    expect(screen.getByText("수정전가맹점")).toBeInTheDocument();

    const editButton = screen.getByLabelText("수정전가맹점 규칙 수정");
    fireEvent.click(editButton);

    const inputs = screen.getAllByRole("textbox");
    // 첫 번째는 신규등록 input, 두 번째가 인라인 수정 input
    const inlineInput = inputs[1];
    fireEvent.change(inlineInput, { target: { value: "수정후가맹점" } });

    const saveButton = screen.getByLabelText("수정 완료");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("수정후가맹점")).toBeInTheDocument();
    });
  });

  it("등록된 규칙의 삭제 버튼을 누르면 목록 및 스토리지에서 삭제되어야 한다", async () => {
    saveStoredMerchantRules([
      { id: "del-1", keyword: "삭제할가맹점", category: "mart", createdAt: 1 },
    ]);

    renderModal(true);
    expect(screen.getByText("삭제할가맹점")).toBeInTheDocument();

    const deleteButton = screen.getByLabelText("삭제할가맹점 규칙 삭제");
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("삭제할가맹점")).not.toBeInTheDocument();
    });

    expect(getStoredMerchantRules().length).toBe(0);
  });

  it("Escape 키를 누르면 onClose 콜백이 호출되어야 한다", () => {
    const onClose = vi.fn();
    renderModal(true, onClose);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
