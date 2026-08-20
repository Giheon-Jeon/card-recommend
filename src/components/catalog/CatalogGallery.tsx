import { useMemo, useState } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { catalogCards, catalogIssuers, catalogTypes } from "@/lib/loadCatalog";
import { CatalogCardTile } from "@/components/catalog/CatalogCardTile";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";

const PAGE_SIZE = 24;

export function CatalogGallery() {
  const [query, setQuery] = useState("");
  const [issuer, setIssuer] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogCards.filter((c) => {
      if (issuer && c.issuer !== issuer) return false;
      if (type && c.category !== type) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.issuer.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [query, issuer, type]);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              resetPaging();
            }}
            placeholder="카드 이름 또는 카드사로 검색"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <select
          value={issuer}
          onChange={(e) => {
            setIssuer(e.target.value);
            resetPaging();
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">전체 카드사</option>
          {catalogIssuers.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>

        <select
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            resetPaging();
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="">전체 종류</option>
          {catalogTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-slate-500">
        총 <span className="font-semibold text-slate-800">{filtered.length.toLocaleString()}</span>개 카드
      </p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">조건에 맞는 카드가 없습니다.</p>
          <p className="text-xs text-slate-400">검색어나 필터를 조정해 보세요.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((entry) => (
              <CatalogCardTile key={entry.sourceId} entry={entry} onSelect={setSelected} />
            ))}
          </div>

          {hasMore && (
            <button
              type="button"
              onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}
              className="mx-auto rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
            >
              더 보기 ({filtered.length - visibleCount}개 남음)
            </button>
          )}
        </>
      )}

      <CardDetailModal entry={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
