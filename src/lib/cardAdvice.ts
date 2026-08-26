import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Category } from "@/types/card";
import type { CardEvaluation } from "@/types/recommendation";

/** 카드 id -> 한 문장 이내의 AI 조언 */
export type CardAdviceMap = Record<string, string>;

function buildCardSummary(evaluation: CardEvaluation, categories: Category[]): string {
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;
  const breakdownText = evaluation.breakdown.length
    ? evaluation.breakdown
        .map(
          (b) =>
            `${categoryLabel(b.category)} 지출 ${Math.round(b.spend).toLocaleString()}원 -> 혜택 ${Math.round(
              b.benefitAmount
            ).toLocaleString()}원${b.capped ? " (한도 초과로 일부만 반영됨)" : ""}`
        )
        .join(", ")
    : "실적 조건 미충족으로 현재 받는 혜택 없음";

  return `- id: ${evaluation.card.id}
  이름: ${evaluation.card.name} (${evaluation.card.issuer})
  연회비: ${evaluation.card.annualFee.toLocaleString()}원
  월 총 혜택액: ${Math.round(evaluation.totalMonthlyBenefit).toLocaleString()}원
  연회비 반영 순혜택: ${Math.round(evaluation.netMonthlyBenefit).toLocaleString()}원
  카테고리별 혜택: ${breakdownText}`;
}

/**
 * Gemini를 사용해 보유 카드 각각에 대한 한 문장 이내의 AI 조언을 생성합니다.
 * 예) "만약 외식에서 10만원 더 사용한다면 이 카드가 더 유리할 수 있어요."
 */
export async function getCardAdvice(
  apiKey: string,
  evaluations: CardEvaluation[],
  categories: Category[]
): Promise<CardAdviceMap> {
  if (!apiKey) {
    throw new Error("Gemini API Key가 필요합니다.");
  }
  if (evaluations.length === 0) {
    return {};
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const systemInstruction = `
당신은 신용카드/체크카드 혜택 비교 전문 어드바이저입니다.
사용자가 보유한 카드들의 카테고리별 지출 및 혜택 데이터를 제공하면, 카드 각각에 대해 한 문장(1문장 이내)의 짧은 조언을 작성해 주세요.

조언 작성 규칙:
1. 가능하면 다른 보유 카드와 비교했을 때 이 카드가 상대적으로 유리해지는 지출 시나리오를 언급하세요.
   예: "만약 외식에서 10만원 더 사용한다면 이 카드가 더 좋을 수 있어요."
2. 이미 다른 카드보다 확실히 우수하다면 그 강점을 짧게 칭찬하세요.
3. 실적 조건을 못 채우고 있다면 그 사실과 부족한 금액을 짧게 언급해도 좋습니다.
4. 반드시 한국어 한 문장(존댓말)으로 작성하고, 너무 길게 쓰지 마세요.

반드시 아래와 같은 순수 JSON 배열 형식으로만 응답하세요. 마크다운 기호(\`\`\`json 등)나 추가 설명 없이 순수 JSON 배열만 반환해야 합니다:
[
  { "cardId": "card-id-1", "advice": "만약 외식에서 10만원 더 사용한다면 이 카드가 더 좋을 수 있어요." }
]
`;

  const prompt = `아래는 사용자가 보유한 카드들의 이번 달 지출 시뮬레이션 결과입니다. 카드 각각에 대해 한 문장 이내의 조언을 만들어 주세요.\n\n${evaluations
    .map((evaluation) => buildCardSummary(evaluation, categories))
    .join("\n\n")}`;

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3,
    },
    systemInstruction,
  });

  const result = await model.generateContent(prompt);
  const responseText = result.response.text() || "";

  try {
    const jsonStr = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return {};

    return (parsed as Record<string, unknown>[]).reduce<CardAdviceMap>((acc, item) => {
      const cardId = String(item.cardId ?? "");
      const advice = String(item.advice ?? "").trim();
      if (cardId && advice) {
        acc[cardId] = advice;
      }
      return acc;
    }, {});
  } catch (error) {
    console.error("Gemini card advice parsing failed:", responseText, error);
    throw new Error("AI 조언 결과 형식이 올바르지 않습니다.");
  }
}
