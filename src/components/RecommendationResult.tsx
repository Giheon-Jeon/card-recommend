import { formatWon } from "@/lib/format";
import type { Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";

interface RecommendationResultProps {
  ranked: CardEvaluation[];
  categoryWinners: CategoryWinner[];
  categories: Category[];
}

export function RecommendationResult({
  ranked,
  categoryWinners,
  categories,
}: RecommendationResultProps) {
  const eligible = ranked.filter((r) => r.meetsMinimum);
  const top = eligible[0] ?? null;
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-lg font-semibold text-slate-900">추천 결과</h2>

      {top ? (
        <p className="mb-5 text-sm text-slate-700">
          입력하신 지출 기준으로는 <span className="font-semibold">{top.card.name}</span> 한 장을
          쓰는 경우 월 순혜택이 {formatWon(top.netMonthlyBenefit)}으로 가장 큽니다.
        </p>
      ) : (
        <p className="mb-5 text-sm text-slate-500">
          현재 지출 기준으로 전월실적을 충족하는 카드가 없습니다. 지출액을 조정해 보세요.
        </p>
      )}

      <h3 className="mb-2 text-sm font-semibold text-slate-700">카테고리별 최적 카드 조합</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="py-2 pr-4">카테고리</th>
              <th className="py-2 pr-4">추천 카드</th>
              <th className="py-2 pr-4">예상 혜택</th>
            </tr>
          </thead>
          <tbody>
            {categoryWinners.map((winner) => (
              <tr key={winner.category} className="border-b border-slate-100">
                <td className="py-2 pr-4">{categoryLabel(winner.category)}</td>
                <td className="py-2 pr-4">
                  {winner.bestCard ? winner.bestCard.name : "해당 없음"}
                </td>
                <td className="py-2 pr-4">{formatWon(winner.benefitAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
