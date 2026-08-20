import { useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";

interface CatalogCardTileProps {
  entry: CatalogEntry;
  onSelect: (entry: CatalogEntry) => void;
}

export function CatalogCardTile({ entry, onSelect }: CatalogCardTileProps) {
  const [imgError, setImgError] = useState(false);
  const showImage = entry.imageUrl && !imgError;

  return (
    <button
      type="button"
      onClick={() => onSelect(entry)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
    >
      <div className="relative flex aspect-[1.586/1] items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-5">
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
