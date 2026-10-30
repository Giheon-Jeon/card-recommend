import { useEffect } from "react";

export type ShortcutTabId = "gallery" | "myCards" | "simulator";

export type ShortcutCategory = "navigation" | "action" | "general";

export interface ShortcutDefinition {
  id: string;
  keys: string[];
  label: string;
  description: string;
  category: ShortcutCategory;
}

export const SHORTCUT_CATEGORIES: Record<ShortcutCategory, string> = {
  navigation: "탭 네비게이션",
  action: "빠른 실행 및 조작",
  general: "일반 및 접근성",
};

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: "tab-gallery",
    keys: ["1"],
    label: "카드 갤러리 탭 이동",
    description: "전체 카드 카탈로그 검색 및 필터 화면으로 전환합니다.",
    category: "navigation",
  },
  {
    id: "tab-my-cards",
    keys: ["2"],
    label: "내 카드 보관함 탭 이동",
    description: "담아둔 카드의 실적 트래커 및 연회비 관리 화면으로 전환합니다.",
    category: "navigation",
  },
  {
    id: "tab-simulator",
    keys: ["3"],
    label: "혜택 시뮬레이터 탭 이동",
    description: "월별 지출 기반 최적 카드 추천 및 명세서 분석 화면으로 전환합니다.",
    category: "navigation",
  },
  {
    id: "focus-search",
    keys: ["/"],
    label: "카드 검색창 포커스",
    description: "카드 갤러리의 검색 입력창으로 즉시 포커스를 이동합니다.",
    category: "action",
  },
  {
    id: "toggle-compare",
    keys: ["C"],
    label: "카드 비교 모달 토글",
    description: "비교함에 담긴 카드의 상세 비교 모달을 열거나 닫습니다.",
    category: "action",
  },
  {
    id: "slider-adjust",
    keys: ["←", "→"],
    label: "지출 슬라이더 미세 조절",
    description: "시뮬레이터 슬라이더 포커스 시 방향키로 지출 금액을 증감합니다.",
    category: "action",
  },
  {
    id: "toggle-help",
    keys: ["?"],
    label: "단축키 도움말 모달",
    description: "현재 화면에서 사용 가능한 모든 키보드 단축키 안내를 표시합니다.",
    category: "general",
  },
  {
    id: "escape-close",
    keys: ["Esc"],
    label: "모달 닫기 / 포커스 해제",
    description: "열려 있는 모달 창을 닫거나 현재 입력창의 포커스를 해제합니다.",
    category: "general",
  },
];

/**
 * 이벤트 타겟이 텍스트 입력이나 선택이 일어나는 폼 요소(input, textarea, select, contenteditable)인지 확인합니다.
 */
export function isEditableElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    // range(슬라이더), button, checkbox, radio 이외의 텍스트/숫자 입력 폼은 단축키 충돌 방지
    if (tagName === "INPUT") {
      const inputType = (target as HTMLInputElement).type?.toLowerCase() || "text";
      if (inputType === "button" || inputType === "submit" || inputType === "reset") {
        return false;
      }
    }
    return true;
  }

  if (target.isContentEditable || target.getAttribute("contenteditable") === "true") {
    return true;
  }

  return false;
}

export interface GlobalShortcutHandlers {
  /** 1/2/3 키 입력 시 탭 전환 콜백 */
  onSelectTab?: (tab: ShortcutTabId) => void;
  /** '/' 키 입력 시 카드 검색창 포커스 콜백 */
  onFocusSearch?: () => void;
  /** 'c' 또는 'C' 키 입력 시 비교함 모달 토글 콜백 */
  onToggleCompare?: () => void;
  /** '?' 키 입력 시 단축키 도움말 모달 토글 콜백 */
  onToggleHelpModal?: () => void;
  /** 'Escape' 키 입력 시 열린 모달 닫기 콜백 */
  onEscape?: () => void;
  /** 단축키 활성화 여부 (기본값 true) */
  enabled?: boolean;
}

/**
 * 전역 키보드 단축키(1/2/3, /, c, ?, Esc)를 등록하고 입력 폼 포커스 시 충돌을 방지하는 훅입니다.
 */
export function useGlobalShortcuts({
  onSelectTab,
  onFocusSearch,
  onToggleCompare,
  onToggleHelpModal,
  onEscape,
  enabled = true,
}: GlobalShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;

      // Ctrl, Alt, Meta 조합 키(브라우저 기본 단축키)는 가로채지 않음
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      if (e.key === "Escape") {
        onEscape?.();
        if (isEditableElement(e.target)) {
          (e.target as HTMLElement).blur?.();
        }
        return;
      }

      // input, textarea, select, contenteditable 내부 타이핑 중에는 단축키 동작 방지
      if (isEditableElement(e.target)) {
        return;
      }

      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        onToggleHelpModal?.();
        return;
      }

      // Shift 조합은 '?' 외에는 단축키로 처리하지 않음 (단, 대문자 'C'는 허용)
      if (e.key === "1" && !e.shiftKey) {
        e.preventDefault();
        onSelectTab?.("gallery");
        return;
      }

      if (e.key === "2" && !e.shiftKey) {
        e.preventDefault();
        onSelectTab?.("myCards");
        return;
      }

      if (e.key === "3" && !e.shiftKey) {
        e.preventDefault();
        onSelectTab?.("simulator");
        return;
      }

      if (e.key === "/" && !e.shiftKey) {
        e.preventDefault();
        onFocusSearch?.();
        return;
      }

      if (e.key === "c" || e.key === "C") {
        e.preventDefault();
        onToggleCompare?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    enabled,
    onSelectTab,
    onFocusSearch,
    onToggleCompare,
    onToggleHelpModal,
    onEscape,
  ]);
}
