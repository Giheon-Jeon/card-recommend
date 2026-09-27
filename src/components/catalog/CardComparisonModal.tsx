import { useEffect, useRef, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";

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
    <div className="flex h-24 w-full items-center justify-center rounded-xl bg-slate-50 p-2">
      {showImage ? (
        <img
          src={card.imageUrl}
          alt={card.name}
          onError={() => setImgError(true)}
          className="h-full max-h-20 w-auto object-contain drop-shadow-sm"
        />
      ) : (
        <div className="flex h-16 w-24 items-center justify-center rounded-lg bg-indigo-100 text-xs font-semibold text-indigo-500">
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

      <div className="relative z-10 flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4">
          <div>
            <h2 id="comparison-modal-title" className="text-lg font-bold text-slate-900">
              관심 카드 혜택 및 연회비 비교
            </h2>
            <p className="text-xs text-slate-500">
              선택한 카드 {cards.length}종의 주요 정보를 나란히 대조하여 비교합니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="비교 모달 닫기"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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
              <tr className="border-b border-slate-200">
                <th className="w-32 py-3 pr-4 font-semibold text-slate-500">항목</th>
                {cards.map((card) => (
                  <th key={card.sourceId} className="min-w-[200px] px-4 py-3 align-top font-semibold text-slate-900">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-600">
                          {card.issuer || "카드사 미상"}
                        </span>
                        {onRemoveCard && (
                          <button
                            type="button"
                            onClick={() => onRemoveCard(card.sourceId)}
                            aria-label={`${card.name} 비교에서 제외`}
                            className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            제외
                          </button>
                        )}
                      </div>
                      <CardImageCell card={card} />
                      <div className="flex flex-col">
                        <span className="line-clamp-2 font-bold leading-snug">{card.name}</span>
                        {card.category && (
                          <span className="mt-1 w-fit rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {card.category}
                          </span>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* 연회비 */}
              <tr>
                <td className="py-4 pr-4 font-semibold text-slate-500">연회비</td>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-4 align-top">
                    <span className="text-base font-bold text-slate-900">
                      {card.annualFee !== undefined ? formatWon(card.annualFee) : "정보 없음"}
                    </span>
                    {card.annualFeeText && (
                      <p className="mt-1 text-xs text-slate-400">{card.annualFeeText}</p>
                    )}
                  </td>
                ))}
              </tr>

              {/* 주요 혜택 요약 */}
              <tr>
                <td className="py-4 pr-4 font-semibold text-slate-500">혜택 요약</td>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-4 align-top">
                    {card.benefitSummary ? (
                      <p className="whitespace-pre-line text-xs leading-relaxed text-slate-700">
                        {card.benefitSummary}
                      </p>
                    ) : (
                      <span className="text-xs text-slate-400">혜택 정보 없음</span>
                    )}
                  </td>
                ))}
              </tr>

              {/* 내 카드 담기 액션 */}
              <tr>
                <td className="py-4 pr-4 font-semibold text-slate-500">내 카드 보관</td>
                {cards.map((card) => {
                  const saved = inMyCards(card.sourceId);
                  return (
                    <td key={card.sourceId} className="px-4 py-4 align-top">
                      <button
                        type="button"
                        onClick={() => onToggleMyCards(card)}
                        className={`flex w-full items-center justify-center gap-1.5 rounded-lg border py-2 text-xs font-semibold transition cursor-pointer ${
                          saved
                            ? "border-indigo-600 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                            : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
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
                <td className="py-4 pr-4 font-semibold text-slate-500">공식 안내</td>
                {cards.map((card) => (
                  <td key={card.sourceId} className="px-4 py-4 align-top">
                    {card.sourceUrl ? (
                      <a
                        href={card.sourceUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                      >
                        카드사 상세 보기 ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-200/80 bg-slate-50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
          >
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}
