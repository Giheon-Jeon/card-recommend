import { useEffect, useRef, type RefObject } from "react";

/** 모달 내부에서 포커스 가능한 요소를 찾는 공통 셀렉터 */
const FOCUSABLE_SELECTOR =
  'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])';

/**
 * 대화상자(모달) 공통 접근성 동작을 제공하는 훅.
 * - 열릴 때 직전 포커스 요소를 저장하고, 닫힐 때 복원 (Focus Restoration)
 * - 열려 있는 동안 배경 스크롤 차단
 * - 첫 번째 포커스 가능한 요소로 자동 포커스
 * - Tab 포커스 트랩(Focus Trap) 순환 제어 및 Escape 닫기
 *
 * @param containerRef 모달 컨테이너(dialog 등) 참조
 * @param isOpen 모달 활성화 여부
 * @param onClose Escape 입력 시 호출할 닫기 콜백
 */
export function useModalBehavior<T extends HTMLElement>(
  containerRef: RefObject<T | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  const prevActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 모달 활성화 전 포커스 위치 보관
    prevActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 차단 및 이전 스타일 저장
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 첫 번째 포커스 가능한 요소로 자동 포커스
    const focusTimer = setTimeout(() => {
      containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== "Tab" || !containerRef.current) return;

      const focusables = Array.from(
        containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      );
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusables[0];
      const lastElement = focusables[focusables.length - 1];
      const active = document.activeElement;
      const isOutside = !containerRef.current.contains(active);

      if (e.shiftKey && (active === firstElement || isOutside)) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && (active === lastElement || isOutside)) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      // 모달 종료 시 이전 활성 요소로 포커스 복원
      prevActiveElementRef.current?.focus?.();
    };
  }, [containerRef, isOpen, onClose]);
}
