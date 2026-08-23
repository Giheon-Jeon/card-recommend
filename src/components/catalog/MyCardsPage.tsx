import { useMemo, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import type { useMyCards } from "@/lib/myCards";
import { catalogCards } from "@/lib/loadCatalog";
import { formatWon } from "@/lib/format";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";

interface MyCardsPageProps {
  myCards: ReturnType<typeof useMyCards>;
}

export function MyCardsPage({ myCards }: MyCardsPageProps) {
  const [selected, setSelected] = useState<CatalogEntry | null>(null);

  const entries = useMemo(() => {
    const idSet = new Set(myCards.ids);
    return catalogCards.filter((c) => idSet.has(c.sourceId));
  }, [myCards.ids]);

  const totalAnnualFee = entries.reduce((sum, c) => sum + (c.annualFee ?? 0), 0);
  const knownFeeCount = entries.filter((c) => c.annualFee !== undefined).length;

  if (entries.length === 0) {
    return (
      <section className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50 text-2xl">
          🗂️
        </div>
        <p className="text-sm font-medium text-slate-600">아직 담아둔 카드가 없습니다.</p>
        <p className="max-w-sm text-xs text-slate-400">
          카드 갤러리에서 카드 우측 상단의 + 버튼을 눌러 내 카드에 추가해 보세요.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">내 카드</h2>
          <p className="mt-1 text-sm text-slate-500">
            보유 중이거나 관심 있는 카드 {entries.length}장을 담아뒀어요.
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-right">
          <p className="text-xs text-indigo-500">
            연회비 합계{knownFeeCount < entries.length ? " (정보 있는 카드만)" : ""}
          </p>
          <p className="text-lg font-bold text-indigo-700">{formatWon(totalAnnualFee)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map((entry) => (
          <div
            key={entry.sourceId}
            className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <button
              type="button"
              onClick={() => setSelected(entry)}
              className="flex flex-1 flex-col gap-2 text-left"
            >
              <p className="text-xs font-medium text-indigo-600">{entry.issuer || "카드사 미상"}</p>
              <h3 className="text-sm font-semibold leading-snug text-slate-900">{entry.name}</h3>
              {entry.benefitSummary && (
                <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {entry.benefitSummary}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-1 text-sm">
                <span className="text-xs text-slate-400">연회비</span>
                <span className="font-semibold text-slate-900">
                  {entry.annualFee !== undefined ? formatWon(entry.annualFee) : "정보 없음"}
                </span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => myCards.remove(entry.sourceId)}
              className="rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-500 transition hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
            >
              내 카드에서 제거
            </button>
          </div>
        ))}
      </div>

      <CardDetailModal
        entry={selected}
        onClose={() => setSelected(null)}
        inMyCards={selected ? myCards.has(selected.sourceId) : false}
        onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
      />
    </section>
  );
}
