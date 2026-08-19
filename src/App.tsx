import { useMemo, useState } from "react";
import { cards, categories } from "@/lib/loadCards";
import { rankCards, bestCardPerCategory } from "@/lib/recommender";
import type { SpendingProfile } from "@/types/card";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import { CardList } from "@/components/CardList";
import { RecommendationResult } from "@/components/RecommendationResult";

function initialSpending(): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

function App() {
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
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">카드 혜택 트래커</h1>
          <p className="mt-1 text-sm text-slate-500">
            보유 카드의 전월실적과 혜택을 정리하고, 지출 패턴에 맞는 카드를 추천받으세요.
          </p>
        </header>

        <SpendingSimulator categories={categories} spending={spending} onChange={handleChange} />
        <RecommendationResult ranked={ranked} categoryWinners={categoryWinners} categories={categories} />
        <CardList evaluations={ranked} />
      </div>
    </div>
  );
}

export default App;
