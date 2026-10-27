import { useState } from "react";
import { Printer } from "lucide-react";
import { formatWon } from "@/lib/format";
import type { Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import type { PortfolioResult } from "@/types/portfolio";
import { PortfolioRecommendationView } from "@/components/PortfolioRecommendation";
import { RecommendationShareButton } from "@/components/RecommendationShareButton";
import {
  formatSingleRecommendationSummary,
  formatPortfolioRecommendationSummary,
} from "@/lib/recommendationShare";
import { evaluateCardWithTaxSavings } from "@/lib/taxDeductionCalculator";
import { getExclusionsForCard } from "@/lib/cardExclusionParser";

interface RecommendationResultProps {
  ranked: CardEvaluation[];
  categoryWinners: CategoryWinner[];
  categories: Category[];
  portfolioResult?: PortfolioResult;
  myCardIds?: number[];
  onAddCards?: (sourceIds: number[]) => void;
  monthlySpend?: number;
}

export function RecommendationResult({
  ranked,
  categoryWinners,
  categories,
  portfolioResult,
  myCardIds,
  onAddCards,
  monthlySpend,
}: RecommendationResultProps) {
  const [activeTab, setActiveTab] = useState<"single" | "portfolio">("single");
  const [includeTaxSavings, setIncludeTaxSavings] = useState(false);
  const [annualSalary, setAnnualSalary] = useState(50000000);
  const [showSalaryPopover, setShowSalaryPopover] = useState(false);

  const eligible = ranked.filter((r) => r.meetsMinimum);
  const top = eligible[0] ?? null;
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const activeWinners = categoryWinners.filter((w) => w.bestCard);

  const hasPortfolio = Boolean(portfolioResult?.pair || portfolioResult?.trio);
  const bestPortfolioIncrease = Math.max(
    portfolioResult?.pair?.benefitIncreaseVsSingle ?? 0,
    portfolioResult?.trio?.benefitIncreaseVsSingle ?? 0,
  );

  // 실질 지출액 (전달받은 월 총지출액 또는 top 카드의 실적 인정 금액)
  const actualMonthlySpend = monthlySpend ?? top?.qualifyingSpend ?? 0;

  // 소득공제 및 피킹률 계산
  const topTaxEvaluation = top
    ? evaluateCardWithTaxSavings(top.card, actualMonthlySpend, top.netMonthlyBenefit, annualSalary)
    : null;
  const topExclusion = top ? getExclusionsForCard(top.card) : null;

  // 현재 활성화된 추천 결과에 맞춘 텍스트 생성기
  const handleGenerateShareText = (options: { includeSpendDetails?: boolean }) => {
    if (activeTab === "portfolio" && (portfolioResult?.pair || portfolioResult?.trio)) {
      const activePort = portfolioResult.pair ?? portfolioResult.trio!;
      return formatPortfolioRecommendationSummary(activePort, categories, options);
    }
    if (top) {
      return formatSingleRecommendationSummary(top, categoryWinners, categories, options);
    }
    return "전월실적 조건을 충족하는 카드가 없습니다.";
  };

  const canShare = activeTab === "portfolio" ? hasPortfolio : Boolean(top);

  return (
    <section
      aria-label="추천 결과 섹션"
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors"
    >
      {/* 인쇄 전용 헤더 서식 */}
      <div className="print-only mb-6 border-b-2 border-indigo-600 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[11px] font-bold text-indigo-700">
              {activeTab === "portfolio" ? "다중 카드 포트폴리오 분석 결과" : "단일 최적 카드 추천 결과"}
            </span>
            <h1 className="mt-1 text-xl font-bold text-slate-900">
              카드 혜택 추천 분석 리포트
            </h1>
            <p className="mt-0.5 text-xs text-slate-600">
              사용자 월간 소비 패턴 기반 AI 최적 혜택 분석 결과서
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>출력일시: {new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
            <div>분석 기준 월 지출: {formatWon(actualMonthlySpend)}</div>
            {includeTaxSavings && (
              <div className="text-indigo-600 font-medium">
                연간 총급여 {Math.round(annualSalary / 10000).toLocaleString()}만원 절세 합산
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 탭 헤더 (화면 전용) */}
      <div className="no-print mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">추천 결과</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            사용자의 월간 소비 패턴을 분석하여 가장 혜택이 큰 카드 및 최적 조합을 추천합니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {hasPortfolio && (
            <div
              role="tablist"
              aria-label="추천 방식 선택"
              className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
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

          {canShare && (
            <RecommendationShareButton
              onGenerateText={handleGenerateShareText}
              title={
                activeTab === "portfolio"
                  ? "AI 최적 카드 포트폴리오 추천 결과"
                  : `${top?.card.name} 카드 혜택 추천 결과`
              }
              label="결과 복사"
              testId="recommendation-header-share-btn"
            />
          )}

          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && typeof window.print === "function") {
                window.print();
              }
            }}
            data-testid="recommendation-print-btn"
            aria-label="추천 분석 리포트 인쇄 및 PDF 저장"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
            <span>리포트 인쇄</span>
          </button>
        </div>
      </div>

      {/* 소득공제 절세 옵션 컨트롤 바 */}
      <div className={`mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-xl bg-slate-50 px-4 py-2.5 dark:bg-slate-800/60 text-xs ${!includeTaxSavings ? "no-print" : ""}`}>
        <div className="flex items-center gap-2">
          <label className="no-print relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              role="switch"
              aria-checked={includeTaxSavings}
              aria-label="연말정산 소득공제 절세 혜택 반영 토글"
              data-testid="toggle-tax-savings"
              checked={includeTaxSavings}
              onChange={(e) => setIncludeTaxSavings(e.target.checked)}
              className="peer sr-only"
            />
            <div className="peer h-5 w-9 rounded-full bg-slate-300 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-indigo-600 peer-checked:after:translate-x-full peer-focus:outline-none dark:bg-slate-700" />
          </label>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            연말정산 소득공제 절세 혜택 합산 반영
          </span>
          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
            신용 15% · 체크 30%
          </span>
        </div>

        {includeTaxSavings && (
          <div className="relative flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">기준 연봉:</span>
            <span className="print-only font-bold text-slate-800 dark:text-slate-200">
              {Math.round(annualSalary / 10000).toLocaleString()}만원
            </span>
            <button
              type="button"
              data-testid="salary-setting-btn"
              onClick={() => setShowSalaryPopover(!showSalaryPopover)}
              aria-expanded={showSalaryPopover}
              aria-label="연봉 설정 변경"
              className="no-print rounded-lg border border-slate-200 bg-white px-2 py-1 font-bold text-slate-800 shadow-xs hover:border-indigo-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 transition"
            >
              {Math.round(annualSalary / 10000).toLocaleString()}만원 ✎
            </button>

            {showSalaryPopover && (
              <dialog
                open
                aria-label="총급여 설정"
                className="absolute right-0 top-full z-20 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-800 text-xs block text-slate-800 dark:text-slate-100"
              >
                <p className="font-bold text-slate-800 dark:text-slate-200 mb-2">연간 총급여액 선택</p>
                <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                  {[30000000, 50000000, 70000000, 100000000].map((sal) => (
                    <button
                      key={sal}
                      type="button"
                      onClick={() => {
                        setAnnualSalary(sal);
                        setShowSalaryPopover(false);
                      }}
                      className={`rounded-md px-2 py-1 text-center font-medium transition ${
                        annualSalary === sal
                          ? "bg-indigo-600 text-white font-bold"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {Math.round(sal / 10000).toLocaleString()}만원
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="5000000"
                    min="10000000"
                    value={annualSalary}
                    onChange={(e) => setAnnualSalary(Math.max(0, Number(e.target.value)))}
                    aria-label="연봉 직접 입력"
                    className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSalaryPopover(false)}
                    className="shrink-0 rounded-md bg-slate-900 px-2.5 py-1 text-white dark:bg-slate-100 dark:text-slate-900 font-bold"
                  >
                    확인
                  </button>
                </div>
              </dialog>
            )}
          </div>
        )}
      </div>

      {activeTab === "single" ? (
        <>
          {top ? (
            <div
              data-testid="top-card-banner"
              className="mb-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold tracking-wide text-indigo-50">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-300" />
                    최적의 카드 1장
                  </span>
                  {topTaxEvaluation && (
                    <span
                      data-testid="picking-rate-badge"
                      className="inline-flex items-center gap-1 rounded-full bg-amber-400/25 border border-amber-300/40 px-2.5 py-0.5 text-xs font-bold text-amber-200"
                    >
                      피킹률 {topTaxEvaluation.pickingRate.pickingRate}% ({topTaxEvaluation.pickingRate.tierLabel})
                    </span>
                  )}
                  {topExclusion && (
                    <span
                      data-testid="card-exclusion-warning-badge"
                      title={topExclusion.summaryNotice}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-400/25 border border-rose-300/40 px-2.5 py-0.5 text-xs font-bold text-rose-200"
                    >
                      실적 제외 주의 ({topExclusion.allExclusions.slice(0, 3).map((e) => e.shortLabel).join("·")})
                    </span>
                  )}
                  {top.card.cardType === "check" && includeTaxSavings && (
                    <span className="rounded-full bg-emerald-400/25 border border-emerald-300/40 px-2 py-0.5 text-[11px] font-bold text-emerald-200">
                      체크 30% 우대 공제
                    </span>
                  )}
                </div>
                <span className="text-xs text-indigo-100">
                  {top.card.issuer} · {top.card.cardType === "credit" ? "신용카드" : "체크카드"}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {top.card.name}
                </h3>
                <p className="mt-1 text-sm text-indigo-100/90">
                  연회비 {formatWon(top.card.annualFee)} · 전월실적 인정금액 {formatWon(top.qualifyingSpend)}
                </p>
              </div>

              <div className={`mt-1 grid gap-2.5 rounded-xl bg-white/10 p-3.5 backdrop-blur-sm ${
                includeTaxSavings ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3"
              }`}>
                <div>
                  <p className="text-[11px] text-indigo-200">
                    {includeTaxSavings ? "월 실질 순혜택 (절세 포함)" : "월 순혜택 (연회비 차감)"}
                  </p>
                  <p className="text-lg font-extrabold text-white">
                    {formatWon(
                      includeTaxSavings && topTaxEvaluation
                        ? topTaxEvaluation.combinedMonthlyNetBenefit
                        : top.netMonthlyBenefit,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-indigo-200">월 총 혜택액</p>
                  <p className="text-base font-bold text-indigo-100">
                    +{formatWon(top.totalMonthlyBenefit)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-indigo-200">월 환산 연회비</p>
                  <p className="text-base font-bold text-indigo-100">
                    -{formatWon(Math.round(top.card.annualFee / 12))}
                  </p>
                </div>
                {includeTaxSavings && topTaxEvaluation && (
                  <div data-testid="tax-savings-cell">
                    <p className="text-[11px] text-indigo-200">월 환산 절세액</p>
                    <p className="text-base font-bold text-emerald-300">
                      +{formatWon(topTaxEvaluation.taxResult.monthlyTaxSavings)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              data-testid="no-eligible-card"
              className="mb-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400"
            >
              <p className="font-semibold text-slate-700 dark:text-slate-300">
                전월실적을 충족하는 카드가 없습니다
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                현재 지출 프로필 기준으로 실적 조건을 만족하는 카드가 없습니다. 소비 금액을 상향 조정해 보세요.
              </p>
            </div>
          )}

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              카테고리별 최적 카드 (단일 기준)
            </h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              실적 충족 카드 중 최고 혜택 매칭
            </span>
          </div>

          {activeWinners.length === 0 ? (
            <div
              data-testid="no-category-winners"
              className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500"
            >
              추천할 수 있는 카테고리 조합이 없습니다.
            </div>
          ) : (
            <div
              data-testid="category-winners-grid"
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            >
              {categoryWinners.map((winner) => (
                <div
                  key={winner.category}
                  className={`flex items-center justify-between rounded-xl border p-3.5 text-sm transition-all ${
                    winner.bestCard
                      ? "border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-800/90"
                      : "border-slate-100 bg-slate-50 text-slate-400 dark:border-slate-800/50 dark:bg-slate-800/30 dark:text-slate-600"
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
                      {categoryLabel(winner.category)}
                    </p>
                    <p className="truncate font-semibold text-slate-800 dark:text-slate-200">
                      {winner.bestCard ? winner.bestCard.name : "해당 없음"}
                    </p>
                    {winner.bestCard && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-500">
                        {winner.bestCard.issuer}
                      </p>
                    )}
                  </div>
                  {winner.bestCard && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                      +{formatWon(winner.benefitAmount)}
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
      {/* 인쇄 전용 푸터 서식 */}
      <div className="print-only mt-8 border-t border-slate-200 pt-3 text-center text-[10px] text-slate-500">
        카드 혜택 트래커 (Card Benefit Tracker) | 본 추천 분석 리포트는 입력된 소비 패턴을 바탕으로 산출된 모의 분석 결과이며, 실제 청구 할인 및 적립 금액은 카드사별 실적 인정 기준에 따라 차이가 있을 수 있습니다.
      </div>
    </section>
  );
}
