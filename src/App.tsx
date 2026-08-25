import { useMemo, useState } from "react";
import { categories } from "@/lib/loadCards";
import { rankCards, bestCardPerCategory } from "@/lib/recommender";
import { useMyCards } from "@/lib/myCards";
import type { CardType, SpendingProfile } from "@/types/card";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import { CardList } from "@/components/CardList";
import { RecommendationResult } from "@/components/RecommendationResult";
import { CatalogGallery } from "@/components/catalog/CatalogGallery";
import { MyCardsPage } from "@/components/catalog/MyCardsPage";
import { SpendingImporter } from "@/components/SpendingImporter";
import type { ParsedSpendingItem } from "@/lib/importerParser";
import { catalogCards, isInfoInsufficient } from "@/lib/loadCatalog";
import { catalogEntryToCard } from "@/lib/cardConverter";

function initialSpending(): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

const ALL_CARD_TYPES: CardType[] = ["credit", "check"];
type Tab = "gallery" | "myCards" | "simulator";
type SimulatorScope = "myCards" | "all";
const ALL_CARDS_DISPLAY_LIMIT = 30;

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "gallery", label: "카드 갤러리", description: "국내 전체 카드 둘러보기" },
  { id: "myCards", label: "내 카드", description: "담아둔 카드 모아보기" },
  { id: "simulator", label: "혜택 시뮬레이터", description: "내 지출로 최적 카드 찾기" },
];

function App() {
  const [tab, setTab] = useState<Tab>("gallery");
  const [spending, setSpending] = useState<SpendingProfile>(initialSpending);
  const [cardTypes, setCardTypes] = useState<CardType[]>(ALL_CARD_TYPES);
  const [simulatorScope, setSimulatorScope] = useState<SimulatorScope>("myCards");
  const myCards = useMyCards();

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

  const myCardEntries = useMemo(() => {
    const idSet = new Set(myCards.ids);
    return catalogCards.filter((c) => idSet.has(c.sourceId));
  }, [myCards.ids]);

  const myCardObjects = useMemo(() => {
    return myCardEntries.map(catalogEntryToCard);
  }, [myCardEntries]);

  // 정보가 충분한(연회비/혜택 요약이 있는) 카드만 "전체 카드 추천" 대상으로 삼습니다.
  const allCardObjects = useMemo(() => {
    return catalogCards.filter((entry) => !isInfoInsufficient(entry)).map(catalogEntryToCard);
  }, []);

  const scopedCardObjects = simulatorScope === "all" ? allCardObjects : myCardObjects;

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
    () => (simulatorScope === "all" ? ranked.slice(0, ALL_CARDS_DISPLAY_LIMIT) : ranked),
    [ranked, simulatorScope],
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6">
          <header>
            <h1 className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-2xl font-extrabold text-transparent">
              카드 혜택 트래커
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              전체 카드를 둘러보고, 내 지출 패턴에 맞는 카드를 추천받아 보세요.
            </p>
          </header>

          <nav className="flex gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-col items-start rounded-xl px-4 py-2.5 text-left transition ${
                  tab === t.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {t.label}
                  {t.id === "myCards" && myCards.ids.length > 0 && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        tab === t.id ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-600"
                      }`}
                    >
                      {myCards.ids.length}
                    </span>
                  )}
                </span>
                <span className={`text-xs ${tab === t.id ? "text-indigo-100" : "text-slate-400"}`}>
                  {t.description}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "gallery" && <CatalogGallery myCards={myCards} />}
        {tab === "myCards" && <MyCardsPage myCards={myCards} />}
        {tab === "simulator" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2 rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setSimulatorScope("myCards")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  simulatorScope === "myCards"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                내 카드 중 추천
              </button>
              <button
                type="button"
                onClick={() => setSimulatorScope("all")}
                className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  simulatorScope === "all"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                전체 카드 중 추천
              </button>
            </div>

            {simulatorScope === "myCards" && myCards.ids.length === 0 ? (
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
                  onClick={() => setTab("gallery")}
                  className="mt-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  카드 갤러리로 이동하기
                </button>
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm text-indigo-800">
                  {simulatorScope === "myCards" ? (
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
                <CardList evaluations={rankedForDisplay} cardTypes={cardTypes} onToggleCardType={toggleCardType} />
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
