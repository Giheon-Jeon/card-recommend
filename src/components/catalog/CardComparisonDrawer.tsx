import { useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { MAX_COMPARE_COUNT } from "@/hooks/useCardComparison";

interface CardComparisonDrawerProps {
  selectedCards: CatalogEntry[];
  onRemoveCard: (sourceId: number) => void;
  onClear: () => void;
  onOpenModal: () => void;
}

function MiniCardThumbnail({
  card,
  onRemove,
}: {
  card: CatalogEntry;
  onRemove: (sourceId: number) => void;
}) {
  const [imgError, setImgError] = useState(false);
  const showImage = card.imageUrl && !imgError;

  return (
    <div className="relative flex items-center gap-2.5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-2 pr-3 transition hover:border-indigo-300">
      <div className="flex h-10 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-1 shadow-xs">
        {showImage ? (
          <img
            src={card.imageUrl}
            alt={card.name}
            onError={() => setImgError(true)}
            className="h-full w-auto object-contain"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded bg-indigo-100 text-[10px] font-bold text-indigo-500">
            CARD
          </div>
        )}
      </div>
      <div className="min-w-0 max-w-[120px] sm:max-w-[160px]">
        <p className="truncate text-[11px] font-medium text-indigo-600">{card.issuer}</p>
        <p className="truncate text-xs font-semibold text-slate-800" title={card.name}>
          {card.name}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onRemove(card.sourceId)}
        aria-label={`${card.name} 비교함에서 제거`}
        className="ml-1 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-rose-100 hover:text-rose-600"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function CardComparisonDrawer({
  selectedCards,
  onRemoveCard,
  onClear,
  onOpenModal,
}: CardComparisonDrawerProps) {
  if (selectedCards.length === 0) return null;

  const emptySlotsCount = Math.max(0, MAX_COMPARE_COUNT - selectedCards.length);
  const canCompare = selectedCards.length >= 2;

  return (
    <aside
      aria-label="카드 비교 서랍"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/90 bg-white/95 p-3 shadow-2xl backdrop-blur-md transition-all duration-300 sm:p-4"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500 text-xs font-bold text-white shadow-xs">
              {selectedCards.length}
            </span>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">
                카드 비교함 ({selectedCards.length}/{MAX_COMPARE_COUNT})
              </span>
              <span className="text-[11px] text-slate-400">
                {canCompare ? "카드를 비교할 준비가 되었습니다." : "비교하려면 1장 이상 더 담아주세요."}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-rose-500 hover:underline sm:hidden"
          >
            전체 비우기
          </button>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto py-1 sm:justify-center">
          {selectedCards.map((card) => (
            <MiniCardThumbnail key={card.sourceId} card={card} onRemove={onRemoveCard} />
          ))}

          {Array.from({ length: emptySlotsCount }).map((_, idx) => (
            <div
              key={`empty-slot-${idx}`}
              className="flex h-[58px] min-w-[130px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 text-center text-xs text-slate-400 sm:min-w-[150px]"
            >
              + 카드 추가 ({selectedCards.length + idx + 1}번째)
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClear}
            className="hidden rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 sm:block"
          >
            전체 비우기
          </button>
          <button
            type="button"
            disabled={!canCompare}
            onClick={onOpenModal}
            className={`flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-bold shadow-sm transition ${
              canCompare
                ? "cursor-pointer bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700 hover:shadow-md"
                : "cursor-not-allowed bg-slate-100 text-slate-400"
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span>비교하기 ({selectedCards.length}종)</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
