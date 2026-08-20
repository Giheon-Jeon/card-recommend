import { useMemo, useState } from "react";
import { cards, categories } from "@/lib/loadCards";
import { rankCards, bestCardPerCategory } from "@/lib/recommender";
import type { SpendingProfile } from "@/types/card";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import { CardList } from "@/components/CardList";
import { RecommendationResult } from "@/components/RecommendationResult";
import { CatalogGallery } from "@/components/catalog/CatalogGallery";

function initialSpending(): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

type Tab = "gallery" | "simulator";

const TABS: { id: Tab; label: string; description: string }[] = [
  { id: "gallery", label: "카드 갤러리", description: "국내 전체 카드 둘러보기" },
  { id: "simulator", label: "혜택 시뮬레이터", description: "내 지출로 최적 카드 찾기" },
];

function App() {
  const [tab, setTab] = useState<Tab>("gallery");
  const [spending, setSpending] = useState<SpendingProfile>(initialSpending);

  const handleChange = (categoryId: string, value: number) => {
    setSpending((prev) => ({ ...prev, [categoryId]: value }));
  };

  const ranked = useMemo(() => rankCards(cards, spending), [spending]);
  const categoryWinners = useMemo(
    () => bestCardPerCategory(cards, spending, categories.map((c) => c.id)),
    [spending],
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
                <span className="text-sm font-semibold">{t.label}</span>
                <span className={`text-xs ${tab === t.id ? "text-indigo-100" : "text-slate-400"}`}>
                  {t.description}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {tab === "gallery" ? (
          <CatalogGallery />
        ) : (
          <div className="flex flex-col gap-6">
            <SpendingSimulator categories={categories} spending={spending} onChange={handleChange} />
            <RecommendationResult ranked={ranked} categoryWinners={categoryWinners} categories={categories} />
            <CardList evaluations={ranked} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
