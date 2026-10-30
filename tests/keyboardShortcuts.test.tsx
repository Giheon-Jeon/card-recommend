import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import axe from "axe-core";
import {
  isEditableElement,
  useGlobalShortcuts,
  SHORTCUT_DEFINITIONS,
} from "@/hooks/useGlobalShortcuts";
import { KeyboardShortcutsModal } from "@/components/KeyboardShortcutsModal";
import App from "@/App";

describe("isEditableElement - 입력 폼 포커스 판별", () => {
  it("input(text, number), textarea, select, contenteditable 요소는 true를 반환해야 한다", () => {
    const textInput = document.createElement("input");
    textInput.type = "text";
    expect(isEditableElement(textInput)).toBe(true);

    const numberInput = document.createElement("input");
    numberInput.type = "number";
    expect(isEditableElement(numberInput)).toBe(true);

    const textarea = document.createElement("textarea");
    expect(isEditableElement(textarea)).toBe(true);

    const select = document.createElement("select");
    expect(isEditableElement(select)).toBe(true);

    const editableDiv = document.createElement("div");
    editableDiv.setAttribute("contenteditable", "true");
    expect(isEditableElement(editableDiv)).toBe(true);
  });

  it("일반 div, button, input[type=button] 요소는 false를 반환해야 한다", () => {
    const div = document.createElement("div");
    expect(isEditableElement(div)).toBe(false);

    const button = document.createElement("button");
    expect(isEditableElement(button)).toBe(false);

    const buttonInput = document.createElement("input");
    buttonInput.type = "button";
    expect(isEditableElement(buttonInput)).toBe(false);

    expect(isEditableElement(null)).toBe(false);
  });
});

describe("useGlobalShortcuts - 전역 단축키 이벤트 리스너 훅", () => {
  it("1, 2, 3, /, c, ?, Escape 키 입력 시 각 핸들러가 정확히 호출되어야 한다", () => {
    const onSelectTab = vi.fn();
    const onFocusSearch = vi.fn();
    const onToggleCompare = vi.fn();
    const onToggleHelpModal = vi.fn();
    const onEscape = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({
        onSelectTab,
        onFocusSearch,
        onToggleCompare,
        onToggleHelpModal,
        onEscape,
      }),
    );

    fireEvent.keyDown(window, { key: "1" });
    expect(onSelectTab).toHaveBeenCalledWith("gallery");

    fireEvent.keyDown(window, { key: "2" });
    expect(onSelectTab).toHaveBeenCalledWith("myCards");

    fireEvent.keyDown(window, { key: "3" });
    expect(onSelectTab).toHaveBeenCalledWith("simulator");

    fireEvent.keyDown(window, { key: "/" });
    expect(onFocusSearch).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "c" });
    fireEvent.keyDown(window, { key: "C" });
    expect(onToggleCompare).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(window, { key: "?" });
    expect(onToggleHelpModal).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it("input 또는 textarea 내부에서 타이핑할 때는 단축키가 동작하지 않고 Escape만 포커스를 해제해야 한다", () => {
    const onSelectTab = vi.fn();
    const onFocusSearch = vi.fn();
    const onToggleCompare = vi.fn();
    const onToggleHelpModal = vi.fn();
    const onEscape = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({
        onSelectTab,
        onFocusSearch,
        onToggleCompare,
        onToggleHelpModal,
        onEscape,
      }),
    );

    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();

    fireEvent.keyDown(input, { key: "1" });
    fireEvent.keyDown(input, { key: "/" });
    fireEvent.keyDown(input, { key: "c" });
    fireEvent.keyDown(input, { key: "?" });

    expect(onSelectTab).not.toHaveBeenCalled();
    expect(onFocusSearch).not.toHaveBeenCalled();
    expect(onToggleCompare).not.toHaveBeenCalled();
    expect(onToggleHelpModal).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: "Escape" });
    expect(onEscape).toHaveBeenCalledTimes(1);

    document.body.removeChild(input);
  });

  it("Ctrl, Alt, Meta 조합 키(예: Ctrl+C)는 브라우저 기본 동작 보호를 위해 무시해야 한다", () => {
    const onToggleCompare = vi.fn();
    const onSelectTab = vi.fn();

    renderHook(() =>
      useGlobalShortcuts({
        onToggleCompare,
        onSelectTab,
      }),
    );

    fireEvent.keyDown(window, { key: "c", ctrlKey: true });
    fireEvent.keyDown(window, { key: "1", metaKey: true });
    fireEvent.keyDown(window, { key: "2", altKey: true });

    expect(onToggleCompare).not.toHaveBeenCalled();
    expect(onSelectTab).not.toHaveBeenCalled();
  });
});

describe("KeyboardShortcutsModal Component", () => {
  it("isOpen=false일 때 렌더링되지 않고 isOpen=true일 때 모든 단축키 목록을 표시해야 한다", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <KeyboardShortcutsModal isOpen={false} onClose={onClose} />,
    );

    expect(screen.queryByTestId("keyboard-shortcuts-modal")).not.toBeInTheDocument();

    rerender(<KeyboardShortcutsModal isOpen={true} onClose={onClose} />);

    expect(screen.getByTestId("keyboard-shortcuts-modal")).toBeInTheDocument();
    expect(screen.getByText("키보드 단축키 안내")).toBeInTheDocument();

    for (const def of SHORTCUT_DEFINITIONS) {
      expect(screen.getByTestId(`shortcut-item-${def.id}`)).toBeInTheDocument();
    }

    fireEvent.click(screen.getByTestId("close-shortcuts-modal-btn"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("단축키 안내 모달이 열린 상태에서 WCAG 접근성 위반이 없어야 한다", async () => {
    const { container } = render(
      <KeyboardShortcutsModal isOpen={true} onClose={vi.fn()} />,
    );

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});

describe("App 전역 단축키 통합 동작", () => {
  it("? 키로 단축키 모달을 열고 Esc 키로 닫을 수 있으며, / 키로 검색창에 포커스해야 한다", async () => {
    render(<App />);

    // 1. ? 키 입력 시 단축키 도움말 모달 오픈
    fireEvent.keyDown(window, { key: "?" });
    expect(screen.getByTestId("keyboard-shortcuts-modal")).toBeInTheDocument();

    // 2. Escape 키 입력 시 모달 닫힘
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByTestId("keyboard-shortcuts-modal")).not.toBeInTheDocument();

    // 3. / 키 입력 시 카드 검색창 포커스
    fireEvent.keyDown(window, { key: "/" });
    await waitFor(() => {
      const searchInput = screen.getByTestId("catalog-search-input");
      expect(document.activeElement).toBe(searchInput);
    });

    // 4. 검색창 포커스 상태에서 ? 키를 눌러도 모달이 열리지 않아야 함
    const searchInput = screen.getByTestId("catalog-search-input");
    fireEvent.keyDown(searchInput, { key: "?" });
    expect(screen.queryByTestId("keyboard-shortcuts-modal")).not.toBeInTheDocument();
  });
});
