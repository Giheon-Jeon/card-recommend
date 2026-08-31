import { Fragment, useState } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { formatWon } from "@/lib/format";
import { getCardAdvice, type CardAdviceMap } from "@/lib/cardAdvice";
import type { Category, CardType } from "@/types/card";
import type { CardEvaluation } from "@/types/recommendation";
import { useGeminiApiKey } from "@/contexts/GeminiApiKeyContext";

interface CardListProps {
  evaluations: CardEvaluation[];
  cardTypes: CardType[];
  categories: Category[];
  onToggleCardType: (type: CardType) => void;
}

const CARD_TYPE_LABEL: Record<CardType, string> = {
  credit: "신용카드",
  check: "체크카드",
};

export function CardList({ evaluations, cardTypes, categories, onToggleCardType }: CardListProps) {
  const { apiKey } = useGeminiApiKey();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [advice, setAdvice] = useState<CardAdviceMap>({});
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  const handleGetAdvice = async () => {
    if (!apiKey) {
      setAdviceError("AI 조언을 받으려면 먼저 지출 내역 가져오기 화면에서 Gemini API Key를 등록해 주세요.");
      return;
    }
    setAdviceLoading(true);
    setAdviceError(null);
    try {
      const result = await getCardAdvice(apiKey, evaluations, categories);
      setAdvice(result);
    } catch (error) {
      setAdviceError(error instanceof Error ? error.message : "AI 조언을 불러오지 못했습니다.");
    } finally {
      setAdviceLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">보유 카드 비교</h2>
        <div className="flex flex-wrap items-center gap-4">
          {(Object.keys(CARD_TYPE_LABEL) as CardType[]).map((type) => (
            <label key={type} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cardTypes.includes(type)}
                onChange={() => onToggleCardType(type)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              {CARD_TYPE_LABEL[type]}
            </label>
          ))}
          <button
            type="button"
            onClick={handleGetAdvice}
            disabled={adviceLoading || evaluations.length === 0}
            className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {adviceLoading ? "AI 조언 생성 중..." : "AI 조언 받기"}
          </button>
        </div>
      </div>

      {adviceError && (
        <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{adviceError}</div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400">
              <th className="py-2 pr-4 font-medium">카드</th>
              <th className="py-2 pr-4 font-medium">연회비</th>
              <th className="py-2 pr-4 font-medium">실적 충족</th>
              <th className="py-2 pr-4 font-medium">월 혜택액</th>
              <th className="py-2 pr-4 font-medium">순혜택(연회비 반영)</th>
              <th className="py-2 pr-4 font-medium" />
            </tr>
          </thead>
          <tbody>
            {evaluations.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-slate-400">
                  선택한 카드 유형에 해당하는 카드가 없습니다.
                </td>
              </tr>
            )}
            {evaluations.map((evaluation, i) => {
              const isBest = i === 0 && evaluation.meetsMinimum;
              const isExpanded = expandedId === evaluation.card.id;
              const cardAdvice = advice[evaluation.card.id];

              return (
                <Fragment key={evaluation.card.id}>
                  <tr
                    className={`border-b border-slate-100 transition hover:bg-indigo-50/40 ${
                      isBest ? "bg-indigo-50/60" : ""
                    } ${isExpanded ? "border-b-0" : ""}`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        {isBest && (
                          <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold text-white">
                            BEST
                          </span>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-slate-900">{evaluation.card.name}</div>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                              {CARD_TYPE_LABEL[evaluation.card.cardType]}
                            </span>
                          </div>
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
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : evaluation.card.id)}
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100"
                      >
                        상세
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <td colSpan={6} className="px-4 py-4">
                        {cardAdvice && (
                          <div className="mb-3 flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-xs text-indigo-800">
                            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
                            <span>{cardAdvice}</span>
                          </div>
                        )}
                        {evaluation.breakdown.length === 0 ? (
                          <p className="text-xs text-slate-400">
                            전월실적 조건을 충족하지 못해 현재 받는 카테고리별 혜택이 없습니다.
                          </p>
                        ) : (
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-400">
                                <th className="py-1.5 pr-4 font-medium">카테고리</th>
                                <th className="py-1.5 pr-4 font-medium">월 지출액</th>
                                <th className="py-1.5 pr-4 font-medium">월 혜택액</th>
                                <th className="py-1.5 pr-4 font-medium">한도</th>
                              </tr>
                            </thead>
                            <tbody>
                              {evaluation.breakdown
                                .slice()
                                .sort((a, b) => b.benefitAmount - a.benefitAmount)
                                .map((item) => (
                                  <tr key={item.category} className="border-b border-slate-100 last:border-b-0">
                                    <td className="py-1.5 pr-4 text-slate-700">{categoryLabel(item.category)}</td>
                                    <td className="py-1.5 pr-4 text-slate-500">{formatWon(item.spend)}</td>
                                    <td className="py-1.5 pr-4 font-medium text-slate-900">
                                      {formatWon(item.benefitAmount)}
                                    </td>
                                    <td className="py-1.5 pr-4">
                                      {item.capped ? (
                                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                          한도 초과
                                        </span>
                                      ) : (
                                        <span className="text-slate-300">-</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
