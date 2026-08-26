import { useMemo, useState } from "react";
import { categories } from "@/lib/loadCards";
import { rankCards, bestCardPerCategory } from "@/lib/recommender";
import { catalogCards, isInfoInsufficient } from "@/lib/loadCatalog";
import { catalogEntryToCard } from "@/lib/cardConverter";
import type { useMyCards } from "@/lib/myCards";
import type { CardType, SpendingProfile } from "@/types/card";
import type { ParsedSpendingItem } from "@/lib/importerParser";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import { CardList } from "@/components/CardList";
import { RecommendationResult } from "@/components/RecommendationResult";
import { SpendingImporter } from "@/components/SpendingImporter";

const ALL_CARD_TYPES: CardType[] = ["credit", "check"];
/** 카드 비교 테이블에 표시할 "전체 카드" 모드의 최대 행 수 (전체 카탈로그를 다 그리면 느려지므로 상위 N개만 표시) */
const ALL_CARDS_DISPLAY_LIMIT = 30;
type SimulatorScope = "myCards" | "all";

function initialSpending(): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

interface SimulatorPageProps {
  myCards: ReturnType<typeof useMyCards>;
  onGoToGallery: () => void;
}

/**
 * 혜택 시뮬레이터 탭 전체를 담당합니다.
 * "내 카드 중 추천"은 즐겨찾기(내 카드)만, "전체 카드 중 추천"은 카탈로그의 전체 카드를
 * 대상으로 지출 프로필 기준 최적 카드를 계산해 보여줍니다.
 */
export function SimulatorPage({ myCards, onGoToGallery }: SimulatorPageProps) {
  const [spending, setSpending] = useState<SpendingProfile>(initialSpending);
  const [cardTypes, setCardTypes] = useState<CardType[]>(ALL_CARD_TYPES);
  const [scope, setScope] = useState<SimulatorScope>("myCards");

  const handleChange = (categoryId: string, value: number) => {
    setSpending((prev) => ({ ...prev, [categoryId]: value }));
  };

  const handleImport = (items: ParsedSpendingItem[], mode: "merge" | "overwrite") => {
    setSpending((prev) => {
      const next = mode === "overwrite" ? initialSpending() : { ...prev };
      items.forEach((item) => {
        if (next[item.category] !== undefined) {
          next[item.category] += item.amount;
        } else {
          next["etc"] = (next["etc"] || 0) + item.amount;
        }
      });
      return next;
    });
  };

  const toggleCardType = (type: CardType) => {
    setCardTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const myCardObjects = useMemo(() => {
    const idSet = new Set(myCards.ids);
    return catalogCards.filter((c) => idSet.has(c.sourceId)).map(catalogEntryToCard);
  }, [myCards.ids]);

  // 정보가 충분한(연회비/혜택 요약이 있는) 카드만 "전체 카드 추천" 대상으로 삼습니다.
  const allCardObjects = useMemo(() => {
    return catalogCards.filter((entry) => !isInfoInsufficient(entry)).map(catalogEntryToCard);
  }, []);

  const scopedCardObjects = scope === "all" ? allCardObjects : myCardObjects;

  const filteredCards = useMemo(
    () => scopedCardObjects.filter((card) => cardTypes.includes(card.cardType)),
    [scopedCardObjects, cardTypes],
  );

  const ranked = useMemo(() => rankCards(filteredCards, spending), [filteredCards, spending]);
  const categoryWinners = useMemo(
    () => bestCardPerCategory(filteredCards, spending, categories.map((c) => c.id)),
    [filteredCards, spending],
  );
  const rankedForDisplay = useMemo(
    () => (scope === "all" ? ranked.slice(0, ALL_CARDS_DISPLAY_LIMIT) : ranked),
    [ranked, scope],
  );

  const showEmptyState = scope === "myCards" && myCards.ids.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
        <button
          type="button"
          onClick={() => setScope("myCards")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            scope === "myCards"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          내 카드 중 추천
        </button>
        <button
          type="button"
          onClick={() => setScope("all")}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
            scope === "all"
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          전체 카드 중 추천
        </button>
      </div>

      {showEmptyState ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-50 text-3xl">
            💳
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">시뮬레이션할 카드가 없습니다</h3>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-400">
              카드 갤러리 탭에서 분석 및 비교하고 싶은 카드를 먼저 담거나, "전체 카드 중 추천"을 선택해 보세요.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToGallery}
            className="mt-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
          >
            카드 갤러리로 이동하기
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-800">
            {scope === "myCards" ? (
              <>
                ✨ 내가 담은 <strong>{myCards.ids.length}개 카드</strong>의 혜택 정보가 시뮬레이션용으로 분석/반영되었습니다.
              </>
            ) : (
              <>
                ✨ 등록된 전체 <strong>{allCardObjects.length}개 카드</strong>를 대상으로 분석했습니다. 순혜택 상위{" "}
                {ALL_CARDS_DISPLAY_LIMIT}개만 표시됩니다.
              </>
            )}
          </div>
          <SpendingImporter categories={categories} onImport={handleImport} />
          <SpendingSimulator categories={categories} spending={spending} onChange={handleChange} />
          <RecommendationResult ranked={ranked} categoryWinners={categoryWinners} categories={categories} />
          <CardList
            evaluations={rankedForDisplay}
            cardTypes={cardTypes}
            categories={categories}
            onToggleCardType={toggleCardType}
          />
        </>
      )}
    </div>
  );
}
