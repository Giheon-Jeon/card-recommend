import { useEffect, useMemo, useRef, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";
import { categories } from "@/lib/loadCatalog";
import { catalogEntryToCard } from "@/lib/cardConverter";
import type { Benefit } from "@/types/card";
import { analyzeBreakEven, estimateMonthlyBenefitFromCard } from "@/lib/benefitCalculator";

interface CardComparisonModalProps {
  isOpen: boolean;
  cards: CatalogEntry[];
  onClose: () => void;
  inMyCards?: (sourceId: number) => boolean;
  onToggleMyCards?: (entry: CatalogEntry) => void;
  onRemoveCard?: (sourceId: number) => void;
}

function CardImageCell({ card }: { card: CatalogEntry }) {
  const [imgError, setImgError] = useState(false);
  const showImage = card.imageUrl && !imgError;

  return (
    <div className="flex h-24 w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800/80 p-2">
      {showImage ? (
        <img
          src={card.imageUrl}
          alt={card.name}
          onError={() => setImgError(true)}
          className="h-full max-h-20 w-auto object-contain drop-shadow-sm"
        />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-950/80 text-xs font-semibold text-indigo-500 dark:text-indigo-400">
          이미지 없음
        </div>
      )}
    </div>
  );
}

export function CardComparisonModal({
  isOpen,
  cards,
  onClose,
  inMyCards = () => false,
  onToggleMyCards = () => {},
  onRemoveCard,
}: CardComparisonModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const prevActiveElementRef = useRef<HTMLElement | null>(null);

  // 각 카드의 파싱된 혜택 매핑 및 손익분기점(BEP) 분석
  const parsedCards = useMemo(() => {
    return cards.map((card) => {
      const parsed = catalogEntryToCard(card);
      const benefits = parsed.tiers[0]?.benefits ?? [];
      const benefitMap = new Map<string, Benefit>();
      for (const b of benefits) {
        benefitMap.set(b.category, b);
      }
      const monthlyBenefit = estimateMonthlyBenefitFromCard(parsed);
      const bep = analyzeBreakEven(monthlyBenefit, card.annualFee || 0);
      return { card, parsed, benefitMap, bep };
    });
  }, [cards]);

  // 비교 카드들 중 최고 연간 순혜택 산출
  const maxNetBenefit = useMemo(() => {
    if (parsedCards.length === 0) return 0;
    return Math.max(...parsedCards.map((p) => p.bep.annualNetBenefit));
  }, [parsedCards]);

  // 비교 카드들 중 최단 회수 기간(개월) 산출
  const bestBreakEvenMonths = useMemo(() => {
    const validMonths = parsedCards
      .map((p) => p.bep.breakEvenMonths)
      .filter((m): m is number => m !== null);
    return validMonths.length > 0 ? Math.min(...validMonths) : null;
  }, [parsedCards]);

  // 카테고리별 최고 혜택률 계산
  const getCategoryBestRate = (catId: string): number => {
    let max = 0;
    for (const p of parsedCards) {
      const b = p.benefitMap.get(catId);
      if (b && b.rate > max) {
        max = b.rate;
      }
    }
    return max;
  };

  useEffect(() => {
    if (!isOpen) return;

    // 포커스 복원을 위한 이전 요소 기록
    prevActiveElementRef.current = document.activeElement as HTMLElement | null;

    // 배경 스크롤 차단
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // 첫 포커스 가능한 요소로 자동 포커스
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
      prevActiveElementRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen || cards.length === 0) return null;

  return (
    <dialog
      ref={dialogRef}
      open
      aria-modal="true"
      aria-labelledby="comparison-modal-title"
      className="fixed inset-0 z-50 m-0 flex h-full w-full max-h-none max-w-none items-center justify-center border-none bg-transparent p-4"
    >
      <button
        type="button"
        aria-label="대화상자 닫기"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 h-full w-full bg-slate-900/60 backdrop-blur-xs -z-10 cursor-default border-none"
      />

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white dark:bg-slate-900 dark:border dark:border-slate-800 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 px-6 py-4">
          <div>
            <h2 id="comparison-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              관심 카드 혜택 및 연회비 비교
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              선택한 카드 {cards.length}종의 주요 스펙과 10개 소비 카테고리별 혜택률을 나란히 대조합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="비교 모달 닫기"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-6">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="w-36 py-3 pr-4 font-semibold text-slate-500 dark:text-slate-400">항목</th>
                {cards.map((card) => (
                  <th key={card.sourceId} className="min-w-[220px] px-4 py-3 align-top font-semibold text-slate-900 dark:text-slate-100">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                          {card.issuer || "카드사 미상"}
                        </span>
                        {onRemoveCard && (
                          <button
                            type="button"
                            onClick={() => onRemoveCard(card.sourceId)}
                            aria-label={`${card.name} 비교에서 제외`}
                            className="text-xs text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                          >
                            제외
                          </button>
                        )}
                      </div>
                      <CardImageCell card={card} />
                      <div className="flex flex-col">
                        <span className="line-clamp-2 font-bold leading-snug">{card.name}</span>
                        {card.category && (
                          <span className="mt-1 w-fit rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300">
                            {card.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* 섹션 구분: 기본 스펙 */}
              <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                <td colSpan={cards.length + 1} className="py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  기본 스펙 대조
                </td>
              </tr>

              {/* 카드 종류 */}
              <tr>
                <th scope="row" className="py-3.5 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  카드 유형
                </th>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-3.5 align-top">
                    <span className="font-medium text-slate-800 dark:text-slate-200">{card.category || "정보 없음"}</span>
                  </td>
                ))}
              </tr>

              {/* 연회비 */}
              <tr>
                <th scope="row" className="py-3.5 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  연회비
                </th>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-3.5 align-top">
                    <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {card.annualFee !== undefined ? formatWon(card.annualFee) : "정보 없음"}
                    </span>
                    {card.annualFeeText && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{card.annualFeeText}</p>
                    )}
                  </td>
                ))}
              </tr>

              {/* 실적 기준 */}
              <tr>
                <th scope="row" className="py-3.5 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  최소 실적 기준
                </th>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-3.5 align-top">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {card.category === "체크" ? "전월 20만원 이상" : "전월 30만원 이상"}
                    </span>
                  </td>
                ))}
              </tr>

              {/* 연간 실질 순혜택 (연 혜택 - 연회비) */}
              <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                <th
                  scope="row"
                  aria-label="연간 예상 순혜택"
                  className="py-3.5 pr-4 text-left font-semibold text-slate-700 dark:text-slate-300"
                >
                  연간 예상 순혜택
                  <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">연 혜택 - 연회비</span>
                </th>
                {parsedCards.map(({ card, bep }) => {
                  const isBest = cards.length > 1 && bep.annualNetBenefit === maxNetBenefit && maxNetBenefit > 0;
                  return (
                    <td
                      key={card.sourceId}
                      aria-label={`${card.name} 연간 예상 순혜택 ${formatWon(bep.annualNetBenefit)}`}
                      className="px-4 py-3.5 align-top"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`text-base font-extrabold ${
                              bep.annualNetBenefit >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {formatWon(bep.annualNetBenefit)}
                          </span>
                          {isBest && (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                              ★ 최고 순혜택
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {bep.annualFee > 0
                            ? `연 ${formatWon(bep.annualBenefit)} - 연회비 ${formatWon(bep.annualFee)}`
                            : "연회비 없음 (100% 순혜택)"}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 연회비 손익분기점 (BEP) */}
              <tr className="bg-indigo-50/40 dark:bg-indigo-950/20">
                <th
                  scope="row"
                  aria-label="연회비 회수 시점 손익분기점"
                  className="py-3.5 pr-4 text-left font-semibold text-slate-700 dark:text-slate-300"
                >
                  연회비 회수 시점
                  <span className="block text-[10px] font-normal text-slate-400 dark:text-slate-500">손익분기점(BEP)</span>
                </th>
                {parsedCards.map(({ card, bep }) => {
                  const isFastest =
                    cards.length > 1 &&
                    bestBreakEvenMonths !== null &&
                    bep.breakEvenMonths === bestBreakEvenMonths;
                  return (
                    <td
                      key={card.sourceId}
                      aria-label={`${card.name} 연회비 회수 시점 ${bep.breakEvenText}`}
                      className="px-4 py-3.5 align-top"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold ${
                              bep.isImmediate
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                                : bep.breakEvenMonths !== null && bep.breakEvenMonths < 1
                                ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                                : bep.isRecoverable
                                ? "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                            }`}
                          >
                            {bep.breakEvenText}
                          </span>
                          {isFastest && (
                            <span className="inline-flex items-center rounded-full bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:text-indigo-300">
                              ★ 최단 회수
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          {bep.isImmediate
                            ? "첫 달부터 순수 혜택"
                            : bep.isRecoverable
                            ? "이후 순수익 발생"
                            : "혜택이 연회비 미달"}
                        </span>
                      </div>
                    </td>
                  );
                })}
              </tr>

              {/* 섹션 구분: 10개 소비 카테고리별 혜택 */}
              <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                <td colSpan={cards.length + 1} className="py-2 px-3 text-xs font-bold text-indigo-900 dark:text-indigo-300">
                  10개 소비 카테고리별 혜택 비교
                </td>
              </tr>

              {categories.map((cat) => {
                const bestRate = getCategoryBestRate(cat.id);
                return (
                  <tr key={cat.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <th scope="row" className="py-3.5 pr-4 text-left font-semibold text-slate-600 dark:text-slate-400">
                      <span>{cat.label}</span>
                    </th>
                    {parsedCards.map(({ card, benefitMap }) => {
                      const benefit = benefitMap.get(cat.id);
                      const isBest = Boolean(benefit && benefit.rate > 0 && benefit.rate === bestRate);
                      return (
                        <td key={card.sourceId} className="px-4 py-3.5 align-top">
                          {benefit && benefit.rate > 0 ? (
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {(benefit.rate * 100).toFixed(1).replace(/\.0$/, "")}%{" "}
                                  {benefit.type === "point" ? "적립" : benefit.type === "cashback" ? "캐시백" : "할인"}
                                </span>
                                {isBest && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                                    ★ 최고 혜택
                                  </span>
                                )}
                              </div>
                              {benefit.capPerMonth && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  월 최대 {formatWon(benefit.capPerMonth)}
                                </span>
                              )}
                              {benefit.description && (
                                <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-2">
                                  {benefit.description}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* 섹션 구분: 부가 정보 */}
              <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                <td colSpan={cards.length + 1} className="py-2 px-3 text-xs font-bold text-slate-700 dark:text-slate-300">
                  기타 안내 및 보관
                </td>
              </tr>

              {/* 주요 혜택 요약 */}
              <tr>
                <th scope="row" className="py-4 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  혜택 요약
                </th>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-4 align-top">
                    {card.benefitSummary ? (
                      <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                        {card.benefitSummary}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">혜택 정보 없음</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 내 카드 담기 액션 */}
              <tr>
                <th scope="row" className="py-4 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  내 카드 보관
                </th>
                {cards.map((card) => {
                  const saved = inMyCards(card.sourceId);
                  return (
                    <td key={card.sourceId} className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => onToggleMyCards(card)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition cursor-pointer ${
                          saved
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300"
                        }`}
                      >
                        {saved ? "내 카드 담김 ✓" : "+ 내 카드 담기"}
                      </button>
                    </td>
                  );
                })}
              </tr>

              {/* 카드 상세보기 링크 */}
              <tr>
                <th scope="row" className="py-4 pr-4 text-left font-semibold text-slate-500 dark:text-slate-400">
                  공식 안내
                </th>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-4 align-top">
                    {card.sourceUrl ? (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        카드사 상세 보기 ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">-</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs transition hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}
