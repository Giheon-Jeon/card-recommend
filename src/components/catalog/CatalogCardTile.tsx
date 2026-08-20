import { useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";

interface CatalogCardTileProps {
  entry: CatalogEntry;
  onSelect: (entry: CatalogEntry) => void;
  inMyCards: boolean;
  onToggleMyCards: (entry: CatalogEntry) => void;
}

export function CatalogCardTile({ entry, onSelect, inMyCards, onToggleMyCards }: CatalogCardTileProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = entry.imageUrl && !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div className="relative flex aspect-[1.586/1] items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-5">
        <span
          role="button"
          tabIndex={0}
          aria-pressed={inMyCards}
          aria-label={inMyCards ? "내 카드에서 제거" : "내 카드에 추가"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleMyCards(entry);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onToggleMyCards(entry);
            }
          }}
          className={`absolute right-3 top-3 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full shadow-sm backdrop-blur transition ${
            inMyCards
              ? "bg-indigo-600 text-white"
              : "bg-white/90 text-slate-400 hover:text-indigo-600"
          }`}
        >
          {inMyCards ? (
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 3.5c-2-2.5-6-1.8-6 2 0 3 3.5 5.7 6 8 2.5-2.3 6-5 6-8 0-3.8-4-4.5-6-2Z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v14m-7-7h14" />
            </svg>
          )}
        </span>
        {showImage ? (
          <img
            src={entry.imageUrl}
            alt={entry.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className="h-full max-h-28 w-auto object-contain drop-shadow-md transition-transform duration-200 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full max-h-28 w-full items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400 to-violet-500 text-xs font-medium text-white/90">
            이미지 없음
          </div>
        )}
        {entry.category && (
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm backdrop-blur">
            {entry.category}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <p className="text-xs font-medium text-indigo-600">{entry.issuer || "카드사 미상"}</p>
          <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {entry.name}
          </h3>
        </div>

        {entry.benefitSummary && (
          <p className="line-clamp-2 flex-1 text-xs leading-relaxed text-slate-500">
            {entry.benefitSummary}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">연회비</span>
          <span className="text-sm font-semibold text-slate-900">
            {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
          </span>
        </div>
      </div>
    </button>
  );
}
