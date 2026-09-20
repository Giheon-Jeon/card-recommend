import { useState } from "react";
import { formatWon } from "@/lib/format";
import type { Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import type { PortfolioResult } from "@/types/portfolio";
import { PortfolioRecommendationView } from "@/components/PortfolioRecommendation";

interface RecommendationResultProps {
  ranked: CardEvaluation[];
  categoryWinners: CategoryWinner[];
  categories: Category[];
  portfolioResult?: PortfolioResult;
  myCardIds?: number[];
  onAddCards?: (sourceIds: number[]) => void;
}

export function RecommendationResult({
  ranked,
  categoryWinners,
  categories,
  portfolioResult,
  myCardIds,
  onAddCards,
}: RecommendationResultProps) {
  const [activeTab, setActiveTab] = useState<"single" | "portfolio">("single");

  const eligible = ranked.filter((r) => r.meetsMinimum);
  const top = eligible[0] ?? null;
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const activeWinners = categoryWinners.filter((w) => w.bestCard);

  const hasPortfolio = Boolean(portfolioResult?.pair || portfolioResult?.trio);
  const bestPortfolioIncrease = Math.max(
    portfolioResult?.pair?.benefitIncreaseVsSingle ?? 0,
    portfolioResult?.trio?.benefitIncreaseVsSingle ?? 0,
  );

  return (
    <section
      aria-label="추천 결과 섹션"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
    >
      {/* 탭 헤더 */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">추천 결과</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            사용자의 월간 소비 패턴을 분석하여 가장 혜택이 큰 카드 및 최적 조합을 추천합니다.
          </p>
        </div>

        {hasPortfolio && (
          <div
            role="tablist"
            aria-label="추천 방식 선택"
            className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "single"}
              onClick={() => setActiveTab("single")}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "single"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              단일 최적 카드
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "portfolio"}
              onClick={() => setActiveTab("portfolio")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                activeTab === "portfolio"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span>다중 카드 포트폴리오 (2~3장)</span>
              {bestPortfolioIncrease > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.2 text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                  +{formatWon(bestPortfolioIncrease)}
                </span>
              )}
            </button>
          </div>
        )}
      </div>

      {activeTab === "single" ? (
        <>
          {top ? (
            <div className="mb-6 flex flex-col gap-1 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-5 text-white shadow-md">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-100">
                최적의 카드 1장
              </p>
              <p className="text-xl font-bold">{top.card.name}</p>
              <p className="text-sm text-indigo-100">
                월 순혜택{" "}
                <span className="font-semibold text-white">
                  {formatWon(top.netMonthlyBenefit)}
                </span>
              </p>
            </div>
          ) : (
            <div className="mb-6 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
              현재 지출 기준으로 전월실적을 충족하는 카드가 없습니다. 지출액을 조정해 보세요.
            </div>
          )}

          <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
            카테고리별 최적 카드 (단일 기준)
          </h3>
          {activeWinners.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">
              추천할 수 있는 카테고리 조합이 없습니다.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {categoryWinners.map((winner) => (
                <div
                  key={winner.category}
                  className={`flex items-center justify-between rounded-xl border p-3 text-sm transition-colors ${
                    winner.bestCard
                      ? "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-800/80"
                      : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-600"
                  }`}
                >
                  <div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">
                      {categoryLabel(winner.category)}
                    </p>
                    <p className="font-medium text-slate-800 dark:text-slate-200">
                      {winner.bestCard ? winner.bestCard.name : "해당 없음"}
                    </p>
                  </div>
                  {winner.bestCard && (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      {formatWon(winner.benefitAmount)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        portfolioResult && (
          <PortfolioRecommendationView
            portfolioResult={portfolioResult}
            categories={categories}
            myCardIds={myCardIds}
            onAddCards={onAddCards}
          />
        )
      )}
    </section>
  );
}
