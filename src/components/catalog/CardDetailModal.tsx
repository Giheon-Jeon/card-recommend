import { useEffect, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { formatWon } from "@/lib/format";

interface CardDetailModalProps {
  entry: CatalogEntry | null;
  onClose: () => void;
}

export function CardDetailModal({ entry, onClose }: CardDetailModalProps) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [entry]);

  useEffect(() => {
    if (!entry) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [entry, onClose]);

  if (!entry) return null;
  const showImage = entry.imageUrl && !imgError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl animate-[popIn_0.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-6 py-8">
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition hover:bg-white hover:text-slate-800"
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
            <p className="text-sm font-medium text-indigo-600">{entry.issuer || "카드사 미상"}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{entry.name}</h2>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm">
            <div>
              <p className="text-xs text-slate-400">카드 종류</p>
              <p className="mt-0.5 font-medium text-slate-800">{entry.category || "정보 없음"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">연회비</p>
              <p className="mt-0.5 font-medium text-slate-800">
                {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
              </p>
            </div>
            {entry.annualFeeText && (
              <div className="col-span-2">
                <p className="text-xs text-slate-400">연회비 상세</p>
                <p className="mt-0.5 font-medium text-slate-800">{entry.annualFeeText}</p>
              </div>
            )}
          </div>

          {entry.benefitSummary && (
            <div>
              <p className="mb-1 text-xs font-semibold text-slate-400">혜택 요약</p>
              <p className="text-sm leading-relaxed text-slate-700">{entry.benefitSummary}</p>
            </div>
          )}

          <a
            href={entry.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            카드고릴라에서 상세보기 ↗
          </a>
        </div>
      </div>
    </div>
  );
}
