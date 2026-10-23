import { useEffect, useRef, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";
import { catalogEntryToCard } from "@/lib/cardConverter";
import { categories } from "@/lib/loadCatalog";
import { analyzeBreakEven, estimateMonthlyBenefitFromCard } from "@/lib/benefitCalculator";
import { getExclusionsForCatalogEntry } from "@/lib/cardExclusionParser";

interface CardDetailModalProps {
  entry: CatalogEntry | null;
  onClose: () => void;
  inMyCards?: boolean;
  onToggleMyCards?: (entry: CatalogEntry) => void;
  monthlyBenefit?: number;
}

export function CardDetailModal({
  entry,
  onClose,
  inMyCards = false,
  onToggleMyCards = () => {},
  monthlyBenefit,
}: CardDetailModalProps) {
  const [prevEntry, setPrevEntry] = useState(entry);
  const [imgError, setImgError] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prevActiveElementRef = useRef<HTMLElement | null>(null);

  if (entry !== prevEntry) {
    setPrevEntry(entry);
    setImgError(false);
  }

  const parsedCard = entry ? catalogEntryToCard(entry) : null;
  const benefits = parsedCard?.tiers[0]?.benefits ?? [];
  const exclusionResult = entry ? getExclusionsForCatalogEntry(entry) : null;

  const effectiveMonthlyBenefit =
    monthlyBenefit ?? (parsedCard ? estimateMonthlyBenefitFromCard(parsedCard) : 0);
  const bepAnalysis = entry
    ? analyzeBreakEven(effectiveMonthlyBenefit, entry.annualFee || 0)
    : null;

  const getCategoryLabel = (catId: string) => {
    return categories.find((c) => c.id === catId)?.label || catId;
  };

  useEffect(() => {
    if (!entry) return;

    // 모달 활성화 전 포커스 위치 보관 (Focus Restoration)
    prevActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 차단 및 이전 스타일 저장
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 첫 번째 포커스 가능한 요소로 자동 포커스
    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape 키 입력 시 모달 닫기
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Tab 키 입력 시 포커스 트랩(Focus Trap) 순환 제어
      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
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
      // 모달 종료 시 이전 활성 요소로 포커스 복원
      prevActiveElementRef.current?.focus?.();
    };
  }, [entry, onClose]);

  if (!entry) return null;
  const showImage = entry.imageUrl && !imgError;

  return (
    <dialog
      ref={dialogRef}
      open
      aria-modal="true"
      aria-labelledby="card-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-none bg-transparent p-4 animate-[fadeIn_0.15s_ease-out]"
    >
      <button
        type="button"
        aria-label="대화상자 닫기"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 h-full w-full bg-slate-900/50 backdrop-blur-sm -z-10 cursor-default border-none"
      />
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 dark:border dark:border-slate-800 shadow-2xl animate-[popIn_0.18s_ease-out]">
        <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800/80 dark:to-slate-800/40 px-6 py-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800/80 text-slate-500 dark:text-slate-300 shadow-sm transition hover:bg-white dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-100"
          >
            ✕
          </button>
          {showImage ? (
            <img
              src={entry.imageUrl}
              alt={entry.name}
              onError={() => setImgError(true)}
              className="max-h-40 w-auto object-contain drop-shadow-lg"
            />
          ) : (
            <div className="flex h-32 w-52 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 text-sm font-medium text-white/90">
              이미지 없음
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 p-6">
          <div>
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{entry.issuer || "카드사 미상"}</p>
            <h2 id="card-modal-title" className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">{entry.name}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">카드 종류</p>
              <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{entry.category || "정보 없음"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">연회비</p>
              <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">실적 기준</p>
              <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">
                {entry.category === "체크" ? "전월 20만원 이상" : "전월 30만원 이상"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-500">출처 링크</p>
              <p className="mt-0.5 font-medium text-indigo-600 dark:text-indigo-400">
                <a href={entry.sourceUrl} target="_blank" rel="noreferrer" className="hover:underline">
                  카드고릴라 제공 ↗
                </a>
              </p>
            </div>
            {entry.annualFeeText && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">연회비 상세</p>
                <p className="mt-0.5 font-medium text-slate-800 dark:text-slate-200">{entry.annualFeeText}</p>
              </div>
            )}
          </div>

          {bepAnalysis && (
            <section
              aria-label="연간 순혜택 및 연회비 회수 분기점 지표"
              className="flex flex-col gap-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-slate-800/90 dark:via-slate-800/60 dark:to-slate-900 p-3.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
                  실질 가치 & 손익분기점 분석
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  월 예상 혜택: {formatWon(bepAnalysis.monthlyBenefit)} 기준
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. 연간 순혜택 */}
                <div className="flex flex-col rounded-lg bg-white/90 dark:bg-slate-900/80 p-2.5 shadow-xs border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">연간 예상 순혜택</span>
                  <span
                    className={`mt-1 text-base font-extrabold ${
                      bepAnalysis.annualNetBenefit >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {formatWon(bepAnalysis.annualNetBenefit)}
                  </span>
                  <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {bepAnalysis.annualFee > 0
                      ? `연 혜택 ${formatWon(bepAnalysis.annualBenefit)} - 연회비 ${formatWon(bepAnalysis.annualFee)}`
                      : "연회비 없음 (100% 순혜택)"}
                  </span>
                </div>

                {/* 2. 연회비 회수 시점 */}
                <div className="flex flex-col rounded-lg bg-white/90 dark:bg-slate-900/80 p-2.5 shadow-xs border border-slate-100 dark:border-slate-800">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">연회비 회수 시점</span>
                  <div className="mt-1 flex items-center gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                        bepAnalysis.isImmediate
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : bepAnalysis.breakEvenMonths !== null && bepAnalysis.breakEvenMonths < 1
                          ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                          : bepAnalysis.isRecoverable
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                      }`}
                    >
                      {bepAnalysis.breakEvenText}
                    </span>
                  </div>
                  <span className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                    {bepAnalysis.isImmediate
                      ? "첫 달부터 순수 혜택"
                      : bepAnalysis.isRecoverable
                      ? "이후 연간 순수익 구간"
                      : "혜택이 연회비에 미달"}
                  </span>
                </div>
              </div>
            </section>
          )}

          {exclusionResult && exclusionResult.allExclusions.length > 0 && (
            <section
              aria-label="실적 및 혜택 제외 항목 안내"
              data-testid="card-exclusions-section"
              className="flex flex-col gap-2 rounded-xl border border-amber-200/80 bg-amber-50/50 p-3.5 dark:border-amber-900/40 dark:bg-amber-950/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-amber-900 dark:text-amber-300">
                    실적 산정 및 혜택 제외 주의 항목
                  </span>
                </div>
                <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                  {exclusionResult.detectedExclusions.length > 0
                    ? "카드 상품 명시 조건"
                    : "표준 약관 공통 기준"}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {exclusionResult.allExclusions.map((item) => {
                  const isDetected = exclusionResult.detectedExclusions.some((d) => d.id === item.id);
                  return (
                    <span
                      key={item.id}
                      data-testid={`exclusion-badge-${item.id}`}
                      title={item.description}
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold transition ${
                        item.warningLevel === "high"
                          ? isDetected
                            ? "border border-rose-300/80 bg-rose-100 text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/70 dark:text-rose-200"
                            : "border border-amber-300/80 bg-amber-100 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-200"
                          : "border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {item.shortLabel}
                      {item.warningLevel === "high" && <span className="text-[10px]">⚠️</span>}
                    </span>
                  );
                })}
              </div>

              <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/80">
                ※ 세금, 공과금, 아파트관리비, 상품권(상테크) 등은 전월 실적 합산 및 혜택 제공에서 제외되므로 소비 입력 시 유의하세요.
              </p>
            </section>
          )}

          {entry.benefitSummary && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-400 dark:text-slate-500">혜택 요약</p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{entry.benefitSummary}</p>
            </div>
          )}

          {benefits.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">실적 구간별 혜택표</p>
                <span className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {entry.category === "체크" ? "전월 20만원 이상 충족 시" : "전월 30만원 이상 충족 시"}
                </span>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 font-semibold text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="px-3 py-2">혜택 항목</th>
                      <th className="px-3 py-2">구분</th>
                      <th className="px-3 py-2">할인·적립률</th>
                      <th className="px-3 py-2 text-right">월 한도</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300">
                    {benefits.map((b, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                          {getCategoryLabel(b.category)}
                          {b.description && (
                            <span className="block max-w-[170px] truncate text-[11px] font-normal text-slate-400 dark:text-slate-500">
                              {b.description}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-flex rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            {b.type === "discount" ? "할인" : b.type === "point" ? "적립" : "캐시백"}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-semibold text-indigo-600 dark:text-indigo-400">
                          {(b.rate * 100).toFixed(1).replace(/\.0$/, "")}%
                        </td>
                        <td className="px-3 py-2 text-right">
                          {b.capPerMonth ? formatWon(b.capPerMonth) : "무제한"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => onToggleMyCards(entry)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition cursor-pointer ${
                inMyCards
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/50"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {inMyCards ? "내 카드에서 제거" : "내 카드에 추가"}
            </button>
            <a
              href={entry.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 transition hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              상세보기 ↗
            </a>
          </div>
        </div>
      </div>
    </dialog>
  );
}
