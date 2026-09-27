import { RotateCcw } from "lucide-react";
import type { Category, SpendingProfile } from "@/types/card";
import { formatWon } from "@/lib/format";
import { getSliderMax } from "@/lib/spendingProfile";

interface SpendingSimulatorProps {
  categories: Category[];
  spending: SpendingProfile;
  onChange: (categoryId: string, value: number) => void;
  onReset?: () => void;
}

const QUICK_STEPS = [0, 50000, 100000, 200000, 300000];

export function SpendingSimulator({
  categories,
  spending,
  onChange,
  onReset,
}: SpendingSimulatorProps) {
  const total = categories.reduce((sum, c) => sum + (spending[c.id] ?? 0), 0);

  const handleResetClick = () => {
    if (typeof window !== "undefined" && typeof window.confirm === "function") {
      if (!window.confirm("모든 카테고리의 예상 월 지출액을 0원으로 초기화하시겠습니까?")) {
        return;
      }
    }
    onReset?.();
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">월 지출 시뮬레이터</h2>
            {onReset && (
              <button
                type="button"
                onClick={handleResetClick}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-200"
                title="모든 지출 입력값 0원으로 초기화"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>전체 초기화</span>
              </button>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            카테고리별 예상 월 지출액을 입력하면 추천 결과가 바로 갱신됩니다.
          </p>
        </div>
        <div className="rounded-xl bg-indigo-50 px-4 py-2 text-right">
          <p className="text-xs text-indigo-500">총 월 지출</p>
          <p className="text-lg font-bold text-indigo-700">{formatWon(total)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const value = spending[category.id] ?? 0;
          const sliderMax = getSliderMax(value);

          return (
            <div
              key={category.id}
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{category.label}</span>
                <span className="text-xs font-semibold text-slate-400">{formatWon(value)}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
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
                className="w-full accent-indigo-600"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={value}
                  aria-label={`${category.label} 지출 금액 입력`}
                  onChange={(e) => onChange(category.id, Number(e.target.value) || 0)}
                  className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {QUICK_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onChange(category.id, step)}
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition ${
                      value === step
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 hover:bg-indigo-100 hover:text-indigo-600"
                    }`}
                  >
                    {step === 0 ? "0" : `${step / 10000}만`}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
