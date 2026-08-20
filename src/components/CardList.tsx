import { formatWon } from "@/lib/format";
import type { CardEvaluation } from "@/types/recommendation";

interface CardListProps {
  evaluations: CardEvaluation[];
}

export function CardList({ evaluations }: CardListProps) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">보유 카드 비교</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-4 font-medium">카드</th>
              <th className="py-2 pr-4 font-medium">연회비</th>
              <th className="py-2 pr-4 font-medium">실적 충족</th>
              <th className="py-2 pr-4 font-medium">월 혜택액</th>
              <th className="py-2 pr-4 font-medium">순혜택(연회비 반영)</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.map((evaluation, i) => (
              <tr
                key={evaluation.card.id}
                className={`border-b border-slate-100 transition hover:bg-indigo-50/40 ${
                  i === 0 && evaluation.meetsMinimum ? "bg-indigo-50/60" : ""
                }`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {i === 0 && evaluation.meetsMinimum && (
                      <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        BEST
                      </span>
                    )}
                    <div>
                      <div className="font-medium text-slate-900">{evaluation.card.name}</div>
                      <div className="text-xs text-slate-500">{evaluation.card.issuer}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-600">{formatWon(evaluation.card.annualFee)}</td>
                <td className="py-3 pr-4">
                  {evaluation.meetsMinimum ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      충족
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">
                      미충족
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 text-slate-600">{formatWon(evaluation.totalMonthlyBenefit)}</td>
                <td className="py-3 pr-4 font-semibold text-slate-900">
                  {formatWon(evaluation.netMonthlyBenefit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
