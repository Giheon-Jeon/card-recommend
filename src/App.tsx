import { useMemo, useState } from "react";
import { cards, categories } from "@/lib/loadCards";
import { rankCards, bestCardPerCategory } from "@/lib/recommender";
import type { CardType, SpendingProfile } from "@/types/card";
import { SpendingSimulator } from "@/components/SpendingSimulator";
import { CardList } from "@/components/CardList";
import { RecommendationResult } from "@/components/RecommendationResult";
import { SpendingImporter } from "@/components/SpendingImporter";
import type { ParsedSpendingItem } from "@/lib/importerParser";

function initialSpending(): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

const ALL_CARD_TYPES: CardType[] = ["credit", "check"];

function App() {
  const [spending, setSpending] = useState<SpendingProfile>(initialSpending);
  const [cardTypes, setCardTypes] = useState<CardType[]>(ALL_CARD_TYPES);

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

  const filteredCards = useMemo(
    () => cards.filter((card) => cardTypes.includes(card.cardType)),
    [cardTypes],
  );

  const ranked = useMemo(() => rankCards(filteredCards, spending), [filteredCards, spending]);
  const categoryWinners = useMemo(
    () => bestCardPerCategory(filteredCards, spending, categories.map((c) => c.id)),
    [filteredCards, spending],
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

        <SpendingImporter categories={categories} onImport={handleImport} />
        <SpendingSimulator categories={categories} spending={spending} onChange={handleChange} />
        <RecommendationResult ranked={ranked} categoryWinners={categoryWinners} categories={categories} />
        <CardList evaluations={ranked} cardTypes={cardTypes} onToggleCardType={toggleCardType} />
      </div>
    </div>
  );
}

export default App;
