import { useState, useMemo } from "react";
import { RotateCcw, PieChart } from "lucide-react";
import type { Category, SpendingProfile } from "@/types/card";
import { formatWon } from "@/lib/format";
import { getSliderMax } from "@/lib/spendingProfile";
import type { SpendingPreset } from "@/lib/spendingPresets";
import { SpendingPresetSelector } from "@/components/SpendingPresetSelector";
import { getCategoryExclusionNotice } from "@/lib/cardExclusionParser";
import { DonutChart, CATEGORY_COLORS } from "@/components/charts";
import type { ChartDataItem } from "@/components/charts";

interface SpendingSimulatorProps {
  categories: Category[];
  spending: SpendingProfile;
  onChange: (categoryId: string, value: number) => void;
  onReset?: () => void;
  onApplyPreset?: (preset: SpendingPreset) => void;
}

const QUICK_STEPS = [0, 50000, 100000, 200000, 300000];

export function SpendingSimulator({
  categories,
  spending,
  onChange,
  onReset,
  onApplyPreset,
}: SpendingSimulatorProps) {
  const [showChart, setShowChart] = useState(true);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const total = categories.reduce((sum, c) => sum + (spending[c.id] ?? 0), 0);

  const chartData: ChartDataItem[] = useMemo(() => {
    return categories.map((c) => ({
      id: c.id,
      label: c.label,
      value: spending[c.id] ?? 0,
      color: CATEGORY_COLORS[c.id],
    }));
  }, [categories, spending]);

  const handleResetClick = () => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (!window.confirm("모든 카테고리의 예상 월 지출액을 0원으로 초기화하시겠습니까?")) {
        return;
      }
    }
    onReset?.();
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-colors">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              월 지출 시뮬레이터
            </h2>
            {onReset && (
              <button
                type="button"
                onClick={handleResetClick}
                className="no-print inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-rose-800/80 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 cursor-pointer"
                title="모든 지출 입력값 0원으로 초기화"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>전체 초기화</span>
              </button>
            )}
            <button
              type="button"
              data-testid="toggle-spending-chart-btn"
              onClick={() => setShowChart((prev) => !prev)}
              aria-expanded={showChart}
              aria-controls="spending-donut-chart-section"
              className={`no-print inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-800 cursor-pointer ${
                showChart
                  ? "border-indigo-200 bg-indigo-50/80 text-indigo-700 dark:border-indigo-900/60 dark:bg-indigo-950/60 dark:text-indigo-300"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700/60"
              }`}
            >
              <PieChart className="h-3.5 w-3.5" />
              <span>{showChart ? "차트 숨기기" : "비중 차트 보기"}</span>
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            카테고리별 예상 월 지출액을 입력하면 추천 결과가 바로 갱신됩니다.
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-right dark:bg-indigo-950/60">
          <p className="text-xs text-indigo-500 dark:text-indigo-400">총 월 지출</p>
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatWon(total)}</p>
        </div>
      </div>

      {onApplyPreset && (
        <div className="no-print">
          <SpendingPresetSelector
            categories={categories}
            spending={spending}
            onApplyPreset={onApplyPreset}
          />
        </div>
      )}

      {/* 카테고리별 지출 비중 도넛 차트 */}
      {showChart && (
        <div id="spending-donut-chart-section" className="mb-6">
          <DonutChart
            data={chartData}
            title="카테고리별 월 지출 비중"
            activeId={activeCategoryId}
            onHoverItem={setActiveCategoryId}
            className="border border-slate-100 shadow-xs dark:border-slate-800/80"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const value = spending[category.id] ?? 0;
          const sliderMax = getSliderMax(value);
          const exclusionNotice = getCategoryExclusionNotice(category.id);
          const isCategoryActive = activeCategoryId === category.id;

          return (
            <div
              key={category.id}
              data-testid={`category-card-${category.id}`}
              onMouseEnter={() => setActiveCategoryId(category.id)}
              onMouseLeave={() => setActiveCategoryId(null)}
              className={`group rounded-xl border p-3 transition ${
                isCategoryActive
                  ? "border-indigo-400 ring-2 ring-indigo-300 bg-indigo-50/40 shadow-sm dark:border-indigo-500 dark:ring-indigo-900/60 dark:bg-indigo-950/30"
                  : "border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 dark:border-slate-800 dark:bg-slate-800/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/70"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CATEGORY_COLORS[category.id] ?? "#6366F1" }}
                    aria-hidden="true"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {category.label}
                  </span>
                  {exclusionNotice && (
                    <span
                      data-testid="category-exclusion-badge"
                      title={exclusionNotice}
                      className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 cursor-help"
                    >
                      실적주의
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-slate-400 dark:text-slate-400">
                  {formatWon(value)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 mb-1">
                <span>0원</span>
                <span>최대 {sliderMax >= 10000 ? `${sliderMax / 10000}만` : `${sliderMax}원`}</span>
              </div>
              <input
                type="range"
                min={0}
                max={sliderMax}
                step={10000}
                value={value}
                aria-label={`${category.label} 지출 슬라이더`}
                onChange={(e) => onChange(category.id, Number(e.target.value))}
                className="no-print w-full accent-indigo-600 dark:accent-indigo-500"
              />
              <div className="no-print mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={value}
                  aria-label={`${category.label} 지출 금액 입력`}
                  onChange={(e) => onChange(category.id, Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-indigo-400 dark:focus:ring-indigo-950"
                />
              </div>
              <div className="no-print mt-2 flex flex-wrap gap-1">
                {QUICK_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onChange(category.id, step)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                      value === step
                        ? "bg-indigo-600 text-white dark:bg-indigo-500"
                        : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                    }`}
                  >
                    {step === 0 ? "0" : `${step / 10000}만`}
                  </button>
                ))}
              </div>
              {exclusionNotice && value > 0 && (
                <p
                  data-testid="category-exclusion-tooltip"
                  className="mt-2 rounded-md bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/60 dark:border-amber-900/40 px-2 py-1 text-[10px] leading-tight text-amber-800 dark:text-amber-300"
                >
                  ⚠️ {exclusionNotice}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
