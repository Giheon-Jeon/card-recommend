import type { Category, SpendingProfile } from "@/types/card";
import { formatWon } from "@/lib/format";

interface SpendingSimulatorProps {
  categories: Category[];
  spending: SpendingProfile;
  onChange: (categoryId: string, value: number) => void;
}

const QUICK_STEPS = [0, 50000, 100000, 200000, 300000];

export function SpendingSimulator({ categories, spending, onChange }: SpendingSimulatorProps) {
  const total = categories.reduce((sum, c) => sum + (spending[c.id] ?? 0), 0);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">월 지출 시뮬레이터</h2>
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
          return (
            <div
              key={category.id}
              className="group rounded-xl border border-slate-200 p-3 transition hover:border-indigo-200 hover:bg-indigo-50/30"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{category.label}</span>
                <span className="text-xs font-semibold text-slate-400">{formatWon(value)}</span>
              </div>
              <input
                type="range"
                min={0}
                max={1000000}
                step={10000}
                value={value}
                onChange={(e) => onChange(category.id, Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={10000}
                  value={value}
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
