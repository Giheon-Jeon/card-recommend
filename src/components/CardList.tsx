import { formatWon } from "@/lib/format";
import type { CardType } from "@/types/card";
import type { CardEvaluation } from "@/types/recommendation";

interface CardListProps {
  evaluations: CardEvaluation[];
  cardTypes: CardType[];
  onToggleCardType: (type: CardType) => void;
}

const CARD_TYPE_LABEL: Record<CardType, string> = {
  credit: "신용카드",
  check: "체크카드",
};

export function CardList({ evaluations, cardTypes, onToggleCardType }: CardListProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">보유 카드 비교</h2>
        <div className="flex gap-4">
          {(Object.keys(CARD_TYPE_LABEL) as CardType[]).map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={cardTypes.includes(type)}
                onChange={() => onToggleCardType(type)}
                className="h-4 w-4 rounded border-slate-300"
              />
              {CARD_TYPE_LABEL[type]}
            </label>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">카드</th>
              <th className="py-2 pr-4">연회비</th>
              <th className="py-2 pr-4">실적 충족</th>
              <th className="py-2 pr-4">월 혜택액</th>
              <th className="py-2 pr-4">순혜택(연회비 반영)</th>
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-sm text-slate-400">
                  선택한 카드 유형에 해당하는 카드가 없습니다.
                </td>
              </tr>
            )}
            {evaluations.map((evaluation) => (
              <tr key={evaluation.card.id} className="border-b border-slate-100">
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900">{evaluation.card.name}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                      {CARD_TYPE_LABEL[evaluation.card.cardType]}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">{evaluation.card.issuer}</div>
                </td>
                <td className="py-2 pr-4">{formatWon(evaluation.card.annualFee)}</td>
                <td className="py-2 pr-4">
                  {evaluation.meetsMinimum ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                      충족
                    </span>
                  ) : (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
                      미충족
                    </span>
                  )}
                </td>
                <td className="py-2 pr-4">{formatWon(evaluation.totalMonthlyBenefit)}</td>
                <td className="py-2 pr-4 font-medium text-slate-900">
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
