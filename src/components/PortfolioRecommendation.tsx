import { useState, useMemo } from "react";
import { formatWon } from "@/lib/format";
import type { Category } from "@/types/card";
import type { PortfolioResult, PortfolioRecommendation, PortfolioSize } from "@/types/portfolio";
import { useToast } from "@/hooks/useToast";

interface PortfolioRecommendationProps {
  portfolioResult: PortfolioResult;
  categories: Category[];
  myCardIds?: number[];
  onAddCards?: (sourceIds: number[]) => void;
}

const CARD_PALETTE = [
  {
    bg: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
    badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    bar: "bg-indigo-500",
  },
  {
    bg: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border-violet-200 dark:border-violet-800",
    bar: "bg-violet-500",
  },
  {
    bg: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    bar: "bg-emerald-500",
  },
];

export function PortfolioRecommendationView({
  portfolioResult,
  categories,
  myCardIds = [],
  onAddCards,
}: PortfolioRecommendationProps) {
  const toast = useToast();
  const { pair, trio } = portfolioResult;

  // 기본적으로 2장 조합(pair)을 먼저 보여주되, pair가 없고 trio만 있으면 3장 선택
  const [selectedSize, setSelectedSize] = useState<PortfolioSize>(() => (pair ? 2 : 3));

  const activePortfolio: PortfolioRecommendation | null =
    selectedSize === 2 ? pair : trio;

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  // 카탈로그 ID(catalog-123 등)에서 숫자 sourceId 추출
  const cardSourceIds = useMemo(() => {
    if (!activePortfolio) return [];
    return activePortfolio.cards
      .map((c) => {
        const match = c.id.match(/\d+/);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((id): id is number => id !== null && !Number.isNaN(id));
  }, [activePortfolio]);

  const unaddedSourceIds = useMemo(() => {
    const mySet = new Set(myCardIds);
    return cardSourceIds.filter((id) => !mySet.has(id));
  }, [cardSourceIds, myCardIds]);

  const handleAddAll = () => {
    if (unaddedSourceIds.length === 0) {
      toast.info("추천 조합의 모든 카드가 이미 '내 카드'에 담겨 있습니다.");
      return;
    }

    if (onAddCards) {
      onAddCards(unaddedSourceIds);
      toast.success(`${unaddedSourceIds.length}장의 추천 카드가 '내 카드'에 추가되었습니다.`);
    }
  };

  if (!pair && !trio) {
    return null;
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              최적 다중 카드 포트폴리오 조합
            </h3>
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300">
              AI 포트폴리오
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            목적별(교통, 카페, 쇼핑 등)로 카드를 나누어 결제했을 때 월 순혜택을 극대화하는 최적 조합입니다.
          </p>
        </div>

        {/* 조합 크기 선택 탭 (2장 vs 3장) */}
        <div
          role="tablist"
          aria-label="포트폴리오 조합 장수 선택"
          className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800 self-start sm:self-auto"
        >
          {pair && (
            <button
              id="portfolio-tab-2"
              type="button"
              role="tab"
              aria-controls="portfolio-tabpanel"
              aria-selected={selectedSize === 2}
              onClick={() => setSelectedSize(2)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                selectedSize === 2
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              2장 조합
            </button>
          )}
          {trio && (
            <button
              id="portfolio-tab-3"
              type="button"
              role="tab"
              aria-controls="portfolio-tabpanel"
              aria-selected={selectedSize === 3}
              onClick={() => setSelectedSize(3)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
                selectedSize === 3
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              3장 조합
            </button>
          )}
        </div>
      </div>

      {activePortfolio ? (
        <div
          id="portfolio-tabpanel"
          role="tabpanel"
          aria-labelledby={selectedSize === 2 ? "portfolio-tab-2" : "portfolio-tab-3"}
          className="flex flex-col gap-5"
        >

          {/* 포트폴리오 핵심 지표 배너 */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-xl bg-gradient-to-br from-indigo-900/90 via-slate-900 to-violet-950 p-5 text-white shadow-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/30 px-2 py-0.5 text-[11px] font-semibold text-indigo-200 uppercase tracking-wider">
                  {activePortfolio.combinationSize}장 포트폴리오 월 순혜택
                </span>
                {activePortfolio.benefitIncreaseVsSingle > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-300">
                    +단일 1위 대비 {formatWon(activePortfolio.benefitIncreaseVsSingle)} 추가 이득
                  </span>
                )}
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                {formatWon(activePortfolio.netMonthlyBenefit)}
                <span className="text-sm font-normal text-indigo-200 ml-1.5">/ 월</span>
              </p>
              <p className="text-xs text-slate-300">
                월간 총 혜택 {formatWon(activePortfolio.totalMonthlyBenefit)} - 합산 연회비 월 환산{" "}
                {formatWon(Math.round(activePortfolio.totalAnnualFee / 12))}
              </p>
            </div>

            {/* 일괄 담기 버튼 */}
            {onAddCards && (
              <button
                type="button"
                onClick={handleAddAll}
                disabled={unaddedSourceIds.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition shadow-sm ${
                  unaddedSourceIds.length > 0
                    ? "bg-indigo-600 text-white hover:bg-indigo-500 active:scale-95"
                    : "bg-white/10 text-slate-400 cursor-not-allowed"
                }`}
              >
                {unaddedSourceIds.length > 0 ? (
                  <>
                    <span>💳</span>
                    <span>조합 카드 {unaddedSourceIds.length}장 '내 카드'에 일괄 추가</span>
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    <span>조합 카드 모두 '내 카드'에 담김</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* 카드별 월간 혜택 기여도 분할 바 차트 */}
          <div className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>카드별 월간 혜택 기여도</span>
              <span>월 총 혜택 {formatWon(activePortfolio.totalMonthlyBenefit)}</span>
            </div>

            {/* 분할 바 */}
            <div
              className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
              aria-hidden="true"
            >
              {activePortfolio.cardAllocations.map((ca, idx) => {
                const percent =
                  activePortfolio.totalMonthlyBenefit > 0
                    ? (ca.monthlyBenefit / activePortfolio.totalMonthlyBenefit) * 100
                    : 100 / activePortfolio.cardAllocations.length;
                const palette = CARD_PALETTE[idx % CARD_PALETTE.length];

                return (
                  <div
                    key={ca.card.id}
                    style={{ width: `${Math.max(percent, 2)}%` }}
                    className={`${palette.bar} h-full transition-all duration-300`}
                    title={`${ca.card.name}: ${formatWon(ca.monthlyBenefit)} (${percent.toFixed(0)}%)`}
                  />
                );
              })}
            </div>

            {/* 카드별 범례 및 실적 상태 */}
            <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2 lg:grid-cols-3">
              {activePortfolio.cardAllocations.map((ca, idx) => {
                const palette = CARD_PALETTE[idx % CARD_PALETTE.length];
                const percent =
                  activePortfolio.totalMonthlyBenefit > 0
                    ? Math.round((ca.monthlyBenefit / activePortfolio.totalMonthlyBenefit) * 100)
                    : 0;

                return (
                  <div
                    key={ca.card.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/70 bg-white p-2.5 text-xs dark:border-slate-700/80 dark:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${palette.bg}`} />
                      <div className="truncate">
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
                          {ca.card.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {ca.card.issuer} · 할당 지출 {formatWon(ca.allocatedSpend)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 dark:text-slate-100">
                        {formatWon(ca.monthlyBenefit)}
                      </p>
                      <span className="text-[10px] font-medium text-slate-400">
                        {percent}% 기여
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 카테고리별 담당 카드 결제 배분 가이드표 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              카테고리별 추천 결제 카드 배분표
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th scope="col" className="px-3.5 py-2.5 font-semibold">소비 카테고리</th>
                    <th scope="col" className="px-3.5 py-2.5 font-semibold text-right">월 지출액</th>
                    <th scope="col" className="px-3.5 py-2.5 font-semibold">추천 결제 카드</th>
                    <th scope="col" className="px-3.5 py-2.5 font-semibold text-center">적용 혜택률</th>
                    <th scope="col" className="px-3.5 py-2.5 font-semibold text-right">월 예상 혜택</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {activePortfolio.categoryAssignments.map((assignment) => {
                    const cardIndex = activePortfolio.cards.findIndex(
                      (c) => c.id === assignment.assignedCard.id,
                    );
                    const palette = CARD_PALETTE[cardIndex >= 0 ? cardIndex % CARD_PALETTE.length : 0];

                    return (
                      <tr
                        key={assignment.category}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="px-3.5 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {categoryLabel(assignment.category)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right text-slate-600 dark:text-slate-400 font-mono">
                          {formatWon(assignment.spend)}
                        </td>
                        <td className="px-3.5 py-2.5" aria-label={`추천 카드: ${assignment.assignedCard.issuer} ${assignment.assignedCard.name}`}>
                          <span
                            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${palette.badge}`}
                          >
                            <span>{assignment.assignedCard.issuer}</span>
                            <span>·</span>
                            <span className="truncate max-w-[120px] sm:max-w-[180px]">
                              {assignment.assignedCard.name}
                            </span>
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-center text-slate-600 dark:text-slate-300 font-semibold font-mono">
                          {(assignment.rate * 100).toFixed(1)}%
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          +{formatWon(assignment.benefitAmount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (

        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
          선택한 {selectedSize}장 조합에 유효한 포트폴리오를 구성할 수 없습니다. 지출액을 조정해 보세요.
        </div>
      )}
    </div>
  );
}
