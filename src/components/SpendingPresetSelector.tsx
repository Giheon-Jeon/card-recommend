import { useState, useRef, useEffect, useCallback, useId } from "react";
import {
  Home,
  Briefcase,
  ShoppingBag,
  Users,
  Coins,
  Sparkles,
  AlertTriangle,
  X,
  Check,
} from "lucide-react";
import type { Category, SpendingProfile } from "@/types/card";
import {
  SPENDING_PRESETS,
  type SpendingPreset,
  hasAnySpending,
  calculateTotalSpending,
  isProfileEqualToPreset,
} from "@/lib/spendingPresets";
import { formatWon } from "@/lib/format";
import { useToast } from "@/hooks/useToast";

interface SpendingPresetSelectorProps {
  categories: Category[];
  spending: SpendingProfile;
  onApplyPreset: (preset: SpendingPreset) => void;
}

const PRESET_ICONS = {
  Home,
  Briefcase,
  ShoppingBag,
  Users,
  Coins,
} as const;

export function SpendingPresetSelector({
  categories,
  spending,
  onApplyPreset,
}: SpendingPresetSelectorProps) {
  const { showToast } = useToast();
  const [pendingPreset, setPendingPreset] = useState<SpendingPreset | null>(null);
  const confirmModalRef = useRef<HTMLDialogElement>(null);
  const triggerButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const lastActiveElementRef = useRef<HTMLElement | null>(null);

  const titleId = useId();
  const descId = useId();

  const currentTotal = calculateTotalSpending(spending, categories);
  const hasExistingInput = hasAnySpending(spending);

  const handlePresetClick = (preset: SpendingPreset) => {
    // 이미 동일한 프리셋이 적용되어 있는 경우
    if (isProfileEqualToPreset(spending, preset, categories)) {
      showToast(`이미 '${preset.name}' 프리셋이 적용되어 있습니다.`, "info");
      return;
    }

    // 기존 입력값이 있는 경우 확인 모달 띄우기
    if (hasExistingInput) {
      lastActiveElementRef.current = document.activeElement as HTMLElement;
      setPendingPreset(preset);
      return;
    }

    // 입력값이 없으면 즉시 적용
    applyPresetDirectly(preset);
  };

  const applyPresetDirectly = (preset: SpendingPreset) => {
    onApplyPreset(preset);
    const presetTotal = calculateTotalSpending(preset.profile, categories);
    showToast(
      `'${preset.name}' 프리셋이 적용되었습니다. (${formatWon(presetTotal)})`,
      "success",
    );
  };

  const handleConfirmOverwrite = () => {
    if (!pendingPreset) return;
    const target = pendingPreset;
    setPendingPreset(null);
    applyPresetDirectly(target);
    // 직전 버튼 포커스 복원
    lastActiveElementRef.current?.focus();
  };

  const handleCloseModal = useCallback(() => {
    setPendingPreset(null);
    lastActiveElementRef.current?.focus();
  }, []);

  // 모달 키보드 내비게이션 (Escape 및 Tab 포커스 트랩)
  useEffect(() => {
    if (!pendingPreset) return;

    // 배경 스크롤 차단
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseModal();
        return;
      }

      if (e.key === "Tab" && confirmModalRef.current) {
        const focusableElements = confirmModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [tabindex="0"]',
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // 모달 진입 시 첫 포커스
    const timer = setTimeout(() => {
      if (confirmModalRef.current) {
        const confirmBtn = confirmModalRef.current.querySelector<HTMLButtonElement>(
          "[data-confirm-btn]",
        );
        confirmBtn?.focus();
      }
    }, 50);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [pendingPreset, handleCloseModal]);

  return (
    <div className="mb-6 rounded-xl border border-slate-200/90 bg-gradient-to-r from-slate-50/80 via-indigo-50/30 to-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60 dark:from-slate-900/80 dark:via-indigo-950/20 dark:to-slate-900/80">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm dark:bg-indigo-500">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            라이프스타일 원클릭 지출 프리셋
          </h3>
          <span className="hidden sm:inline-block rounded-full bg-indigo-100/70 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            빠른 시작
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          선택 시 10개 카테고리 금액이 자동 채워집니다.
        </p>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
        aria-label="라이프스타일 소비 지출 프리셋 선택"
      >
        {SPENDING_PRESETS.map((preset) => {
          const Icon = PRESET_ICONS[preset.iconName] || Sparkles;
          const isSelected = isProfileEqualToPreset(spending, preset, categories);
          const presetTotal = calculateTotalSpending(preset.profile, categories);

          return (
            <button
              key={preset.id}
              ref={(el) => {
                triggerButtonRefs.current[preset.id] = el;
              }}
              type="button"
              onClick={() => handlePresetClick(preset)}
              aria-pressed={isSelected}
              aria-label={`${preset.name} 프리셋 선택, 예상 총액 ${formatWon(presetTotal)}`}
              className={`group relative flex flex-col justify-between rounded-xl border p-3 text-left transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 ${
                isSelected
                  ? "border-indigo-600 bg-white shadow-md ring-1 ring-indigo-600 dark:border-indigo-500 dark:bg-slate-800 dark:ring-indigo-500"
                  : "border-slate-200/90 bg-white/80 hover:border-indigo-300 hover:bg-white hover:shadow-sm dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-slate-700 dark:hover:bg-slate-800"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                      isSelected
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-slate-700/80 dark:text-slate-300 dark:group-hover:bg-indigo-950/60 dark:group-hover:text-indigo-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      isSelected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {preset.badge}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                    {preset.name}
                  </span>
                  {isSelected && (
                    <Check className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {preset.description}
                </p>
              </div>

              <div className="mt-2.5 flex flex-wrap gap-1">
                {preset.summaryTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-slate-100/90 px-1.5 py-0.5 text-[9px] font-medium text-slate-600 dark:bg-slate-700/60 dark:text-slate-300"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* 덮어쓰기 확인 대화상자 모달 */}
      {pendingPreset && (
        <dialog
          ref={confirmModalRef}
          open
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-none bg-transparent p-4 animate-in fade-in duration-150"
        >
          <button
            type="button"
            aria-label="배경 클릭 시 대화상자 닫기"
            aria-hidden="true"
            tabIndex={-1}
            onClick={handleCloseModal}
            className="fixed inset-0 h-full w-full bg-slate-900/60 backdrop-blur-xs -z-10 cursor-default border-none"
          />
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/80">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h4 id={titleId} className="text-base font-bold text-slate-900 dark:text-slate-100">
                  지출 프로필 덮어쓰기 확인
                </h4>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                aria-label="닫기"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div id={descId} className="mt-4 text-sm text-slate-600 dark:text-slate-300 space-y-3">
              <p>
                현재 입력된 예상 월 지출액(
                <strong className="text-slate-900 dark:text-slate-100">
                  {formatWon(currentTotal)}
                </strong>
                )이 존재합니다.
              </p>
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-800/60">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  선택한 프리셋:
                </p>
                <p className="mt-0.5 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  {pendingPreset.name} ({pendingPreset.badge})
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {pendingPreset.description}
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                프리셋을 적용하면 기존에 입력한 카테고리별 지출 금액이 선택한 프리셋의 표준
                금액으로 대체됩니다. 계속 진행하시겠습니까?
              </p>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                취소
              </button>
              <button
                type="button"
                data-confirm-btn
                onClick={handleConfirmOverwrite}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-600"
              >
                덮어쓰기 적용
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
