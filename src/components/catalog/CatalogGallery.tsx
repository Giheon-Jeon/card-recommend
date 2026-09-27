import { useMemo, useState, useEffect, useRef } from "react";
import type { CatalogEntry } from "@/types/catalog";
import { catalogCards, catalogIssuers, catalogTypes, isInfoInsufficient } from "@/lib/loadCatalog";
import type { useMyCards } from "@/lib/myCards";
import { CatalogCardTile } from "@/components/catalog/CatalogCardTile";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";
import { CardComparisonDrawer } from "@/components/catalog/CardComparisonDrawer";
import { CardComparisonModal } from "@/components/catalog/CardComparisonModal";
import { useDebounce } from "@/hooks/useDebounce";
import { useCardComparison } from "@/hooks/useCardComparison";

const PAGE_SIZE = 24;

interface CatalogGalleryProps {
  myCards: ReturnType<typeof useMyCards>;
}

export type CatalogSortOption = "default" | "fee-asc" | "fee-desc" | "name-asc" | "newest";

export function CatalogGallery({ myCards }: CatalogGalleryProps) {
  const [query, setQuery] = useState("");
  const [issuer, setIssuer] = useState<string>("");
  const [type, setType] = useState<string>("");
  const [sortOption, setSortOption] = useState<CatalogSortOption>("default");
  const [hideInsufficient, setHideInsufficient] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState<CatalogEntry | null>(null);
  const comparison = useCardComparison();

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const debouncedQuery = useDebounce(query, 250);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return catalogCards.filter((c) => {
      if (issuer && c.issuer !== issuer) return false;
      if (type && c.category !== type) return false;
      if (hideInsufficient && isInfoInsufficient(c)) return false;
      if (q && !c.name.toLowerCase().includes(q) && !c.issuer.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [debouncedQuery, issuer, type, hideInsufficient]);

  const sorted = useMemo(() => {
    if (sortOption === "default") return filtered;
    const items = [...filtered];
    switch (sortOption) {
      case "fee-asc":
        return items.sort((a, b) => {
          const feeA = a.annualFee ?? Number.MAX_SAFE_INTEGER;
          const feeB = b.annualFee ?? Number.MAX_SAFE_INTEGER;
          if (feeA !== feeB) return feeA - feeB;
          return a.sourceId - b.sourceId;
        });
      case "fee-desc":
        return items.sort((a, b) => {
          const feeA = a.annualFee ?? -1;
          const feeB = b.annualFee ?? -1;
          if (feeA !== feeB) return feeB - feeA;
          return a.sourceId - b.sourceId;
        });
      case "name-asc":
        return items.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      case "newest":
        return items.sort((a, b) => b.sourceId - a.sourceId);
      default:
        return items;
    }
  }, [filtered, sortOption]);

  const visible = sorted.slice(0, visibleCount);
  const hasMore = visibleCount < sorted.length;

  const resetPaging = () => setVisibleCount(PAGE_SIZE);

  useEffect(() => {
    if (!hasMore || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((v) => Math.min(v + PAGE_SIZE, sorted.length));
        }
      },
      { rootMargin: "300px" },
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasMore, sorted.length]);

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
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-9 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
          />
          {query && (
            <button
              type="button"
              aria-label="검색어 초기화"
              onClick={() => {
                setQuery("");
                resetPaging();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
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

        <select
          aria-label="정렬 기준"
          value={sortOption}
          onChange={(e) => {
            setSortOption(e.target.value as CatalogSortOption);
            resetPaging();
          }}
          className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
        >
          <option value="default">기본순</option>
          <option value="fee-asc">연회비 낮은순</option>
          <option value="fee-desc">연회비 높은순</option>
          <option value="name-asc">카드명 가나다순</option>
          <option value="newest">최신 등록순</option>
        </select>

        <button
          type="button"
          onClick={() => {
            setHideInsufficient((v) => !v);
            resetPaging();
          }}
          aria-pressed={hideInsufficient}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
            hideInsufficient
              ? "border-indigo-500 bg-indigo-600 text-white"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300 hover:text-indigo-600"
          }`}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4.5h18M6 4.5v15a1.5 1.5 0 0 0 1.5 1.5h9a1.5 1.5 0 0 0 1.5-1.5v-15M9 8v8M15 8v8" />
          </svg>
          정보 부족 카드 제외
        </button>
      </div>

      <p className="text-sm text-slate-500">
        총 <span className="font-semibold text-slate-800">{filtered.length.toLocaleString()}</span>개 카드
        {hideInsufficient && (
          <span className="ml-1 text-xs text-slate-400">
            (연회비·혜택 정보가 없는 카드는 제외됨)
          </span>
        )}
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
              <CatalogCardTile
                key={entry.sourceId}
                entry={entry}
                onSelect={setSelected}
                inMyCards={myCards.has(entry.sourceId)}
                onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
                isCompared={comparison.isSelected(entry.sourceId)}
                onToggleCompare={comparison.toggleCard}
              />
            ))}
          </div>

          {hasMore && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <div ref={sentinelRef} className="h-4 w-full" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setVisibleCount((v) => Math.min(v + PAGE_SIZE, filtered.length))}
                className="mx-auto rounded-lg border border-slate-200 bg-white px-6 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:border-indigo-300 hover:text-indigo-600"
              >
                더 보기 ({filtered.length - visibleCount}개 남음)
              </button>
            </div>
          )}
        </>
      )}

      <CardDetailModal
        entry={selected}
        onClose={() => setSelected(null)}
        inMyCards={selected ? myCards.has(selected.sourceId) : false}
        onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
      />

      <CardComparisonDrawer
        selectedCards={comparison.selectedCards}
        onRemoveCard={comparison.removeCard}
        onClear={comparison.clear}
        onOpenModal={comparison.openModal}
      />

      <CardComparisonModal
        isOpen={comparison.isModalOpen}
        cards={comparison.selectedCards}
        onClose={comparison.closeModal}
        inMyCards={(id) => myCards.has(id)}
        onToggleMyCards={(e) => myCards.toggle(e.sourceId)}
        onRemoveCard={comparison.removeCard}
      />

      {visibleCount > PAGE_SIZE && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="맨 위로 이동"
          className={`fixed right-6 z-30 flex h-11 w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
            comparison.count > 0 ? "bottom-28 sm:bottom-24" : "bottom-6"
          }`}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </section>
  );
}
