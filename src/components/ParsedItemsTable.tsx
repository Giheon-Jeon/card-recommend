import { Check, Plus, Trash2 } from "lucide-react";
import type { Category } from "@/types/card";
import type { ParsedSpendingItem } from "@/lib/importerParser";

type ImportMode = "merge" | "overwrite";

interface ParsedItemsTableProps {
  categories: Category[];
  items: ParsedSpendingItem[];
  onUpdateItem: <K extends keyof ParsedSpendingItem>(
    index: number,
    field: K,
    value: ParsedSpendingItem[K],
  ) => void;
  onDeleteItem: (index: number) => void;
  onAddItem?: () => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  onCancel: () => void;
  onApply: () => void;
}

/** AI/로컬 분석 결과를 검토·수정하고 지출 시뮬레이터에 반영하기 전 보여주는 미리보기 테이블. */
export function ParsedItemsTable({
  categories,
  items,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
  importMode,
  onImportModeChange,
  onCancel,
  onApply,
}: ParsedItemsTableProps) {
  const hasRefund = items.some((item) => item.amount < 0);

  return (
    <div className="mt-6 border-t border-slate-100 pt-5 animate-fadeIn">
      <div className="mb-3.5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
        <h3 className="text-sm font-bold text-slate-800">지출 파싱 결과 미리보기 ({items.length}건)</h3>
        <span className="text-xs text-slate-400">
          {hasRefund
            ? "💡 환불/취소 내역(음수 금액)은 시뮬레이터 적용 시 지출에서 차감됩니다."
            : "데이터를 검토하고 수정한 뒤 시뮬레이터에 적용하세요."}
        </span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-2.5">가맹점(내역)</th>
              <th className="px-4 py-2.5 w-32">카테고리</th>
              <th className="px-4 py-2.5 w-32">금액</th>
              <th className="px-2 py-2.5 text-center w-12">삭제</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {items.map((item, index) => {
              const isRefund = item.amount < 0;
              return (
                <tr key={index} className={`hover:bg-slate-50/50 ${isRefund ? "bg-rose-50/20" : ""}`}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1.5">
                      {isRefund && (
                        <span className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold bg-rose-100 text-rose-700">
                          환불/취소
                        </span>
                      )}
                      <input
                        type="text"
                        aria-label="가맹점명"
                        value={item.merchant}
                        onChange={(e) => onUpdateItem(index, "merchant", e.target.value)}
                        className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-medium text-slate-800 hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={item.category}
                      aria-label="카테고리"
                      onChange={(e) => onUpdateItem(index, "category", e.target.value)}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 font-semibold text-slate-700 hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      aria-label="금액"
                      value={item.amount}
                      step={1000}
                      onChange={(e) => onUpdateItem(index, "amount", Number(e.target.value) || 0)}
                      className={`w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-bold hover:border-slate-200 focus:border-indigo-500 focus:bg-white focus:outline-none ${
                        isRefund ? "text-rose-600" : "text-slate-800"
                      }`}
                    />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <button
                      type="button"
                      aria-label="항목 삭제"
                      onClick={() => onDeleteItem(index)}
                      className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {onAddItem && (
        <div className="mt-2.5 flex justify-start">
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-indigo-300 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100/70 hover:border-indigo-400 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            지출 항목 직접 추가
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-col justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/20 p-4 sm:flex-row sm:items-center">
        <div className="flex gap-4">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "merge"}
              onChange={() => onImportModeChange("merge")}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            기존 지출액에 합산 (누적)
          </label>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
            <input
              type="radio"
              name="importMode"
              checked={importMode === "overwrite"}
              onChange={() => onImportModeChange("overwrite")}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            기존 값 덮어쓰기 (교체)
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onApply}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 transition-colors"
          >
            <Check className="h-4 w-4" />
            지출 시뮬레이터에 적용
          </button>
        </div>
      </div>
    </div>
  );
}
