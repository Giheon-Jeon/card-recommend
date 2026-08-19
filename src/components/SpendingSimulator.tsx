import type { Category, SpendingProfile } from "@/types/card";

interface SpendingSimulatorProps {
  categories: Category[];
  spending: SpendingProfile;
  onChange: (categoryId: string, value: number) => void;
}

export function SpendingSimulator({ categories, spending, onChange }: SpendingSimulatorProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">월 지출 시뮬레이터</h2>
      <p className="mb-4 text-sm text-slate-500">
        카테고리별 예상 월 지출액을 입력하면 아래 추천 결과가 바로 갱신됩니다.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {categories.map((category) => (
          <label key={category.id} className="flex flex-col gap-1 text-sm">
            <span className="text-slate-600">{category.label}</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={spending[category.id] ?? 0}
              onChange={(e) => onChange(category.id, Number(e.target.value) || 0)}
              className="rounded-md border border-slate-300 px-2 py-1.5 focus:border-slate-500 focus:outline-none"
            />
          </label>
        ))}
      </div>
    </section>
  );
}
