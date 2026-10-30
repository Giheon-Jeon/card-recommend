import { useEffect, useRef } from "react";
import {
  SHORTCUT_CATEGORIES,
  SHORTCUT_DEFINITIONS,
  type ShortcutCategory,
} from "@/hooks/useGlobalShortcuts";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ORDER: ShortcutCategory[] = ["navigation", "action", "general"];

export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prevActiveElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    prevActiveElementRef.current = document.activeElement as HTMLElement | null;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])',
          ),
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === firstElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (
            document.activeElement === lastElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      open
      aria-modal="true"
      aria-labelledby="keyboard-shortcuts-modal-title"
      data-testid="keyboard-shortcuts-modal"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-none bg-transparent p-4 animate-[fadeIn_0.15s_ease-out]"
    >
      <button
        type="button"
        aria-label="단축키 안내 모달 배경 닫기"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 h-full w-full bg-slate-900/50 backdrop-blur-sm -z-10 cursor-default border-none"
      />

      <div className="relative z-10 flex w-full max-w-lg max-h-[90vh] flex-col gap-5 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl animate-[popIn_0.18s_ease-out]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                ⌨️
              </span>
              <h2
                id="keyboard-shortcuts-modal-title"
                className="text-lg font-bold text-slate-900 dark:text-slate-100"
              >
                키보드 단축키 안내
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              마우스 없이 키보드만으로 탭 전환, 검색, 카드 비교를 빠르게 실행할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="단축키 안내 닫기"
            data-testid="close-shortcuts-modal-btn"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-300 transition hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => {
            const items = SHORTCUT_DEFINITIONS.filter((item) => item.category === category);
            return (
              <section key={category} aria-label={SHORTCUT_CATEGORIES[category]} className="flex flex-col gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {SHORTCUT_CATEGORIES[category]}
                </h3>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
                  {items.map((shortcut) => (
                    <div
                      key={shortcut.id}
                      data-testid={`shortcut-item-${shortcut.id}`}
                      className="flex items-center justify-between gap-3 px-3.5 py-2.5"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {shortcut.label}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {shortcut.description}
                        </span>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((keyLabel) => (
                          <kbd
                            key={keyLabel}
                            className="inline-flex min-w-[26px] items-center justify-center rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-2 py-1 font-mono text-xs font-bold text-slate-700 dark:text-slate-200 shadow-xs"
                          >
                            {keyLabel}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 px-3.5 py-2.5 text-[11px] text-indigo-900 dark:text-indigo-200 border border-indigo-100 dark:border-indigo-900/50">
          <span>
            💡 검색창이나 금액 입력란(input, textarea)에 포커스된 상태에서는 오타 방지를 위해 단축키가 일시 비활성화됩니다.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-700"
          >
            확인
          </button>
        </div>
      </div>
    </dialog>
  );
}
