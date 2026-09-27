import { vi, describe, it, expect, beforeEach } from "vitest";
import { getCardAdvice } from "@/lib/cardAdvice";
import type { CardEvaluation } from "@/types/recommendation";
import type { Category } from "@/types/card";

// GoogleGenerativeAI 모킹
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn().mockReturnValue({
  generateContent: mockGenerateContent,
});

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      getGenerativeModel = mockGetGenerativeModel;
    },
  };
});

describe("getCardAdvice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("apiKey가 없으면 에러를 던져야 한다", async () => {
    await expect(getCardAdvice("", [], [])).rejects.toThrow("Gemini API Key가 필요합니다.");
  });

  it("evaluations가 빈 배열이면 바로 빈 객체를 반환해야 한다", async () => {
    const result = await getCardAdvice("dummy-key", [], []);
    expect(result).toEqual({});
    expect(mockGetGenerativeModel).not.toHaveBeenCalled();
  });

  it("Gemini API 호출에 성공하고 올바른 JSON 형식이 반환되면 파싱된 조언 맵을 반환해야 한다", async () => {
    const sampleEvaluations: CardEvaluation[] = [
      {
        card: {
          id: "card-1",
          name: "카드 1",
          issuer: "A사",
          cardType: "credit",
          annualFee: 10000,
          excludedCategories: [],
          tiers: [],
        },
        meetsMinimum: true,
        tierIndex: 0,
        totalMonthlyBenefit: 5000,
        netMonthlyBenefit: 4000,
        breakdown: [{ category: "cafe", spend: 50000, benefitAmount: 5000, capped: false }],
      },
    ];

    const sampleCategories: Category[] = [
      { id: "cafe", label: "카페" },
    ];

    // mock 반환값 설정
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify([
          { cardId: "card-1", advice: "카페 지출을 유지하면 혜택이 좋습니다." },
        ]),
      },
    });

    const adviceMap = await getCardAdvice("dummy-key", sampleEvaluations, sampleCategories);

    expect(adviceMap).toEqual({
      "card-1": "카페 지출을 유지하면 혜택이 좋습니다.",
    });
    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.3,
      },
      systemInstruction: expect.any(String),
    });
  });

  it("Gemini API 응답 결과가 마크다운 코드블록을 포함하고 있어도 이를 정제해서 정상 파싱해야 한다", async () => {
    const sampleEvaluations: CardEvaluation[] = [
      {
        card: {
          id: "card-1",
          name: "카드 1",
          issuer: "A사",
          cardType: "credit",
          annualFee: 10000,
          excludedCategories: [],
          tiers: [],
        },
        meetsMinimum: true,
        tierIndex: 0,
        totalMonthlyBenefit: 5000,
        netMonthlyBenefit: 4000,
        breakdown: [],
      },
    ];

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "```json\n[\n  { \"cardId\": \"card-1\", \"advice\": \"마크다운 포함 조언\" }\n]\n```",
      },
    });

    const adviceMap = await getCardAdvice("dummy-key", sampleEvaluations, []);
    expect(adviceMap).toEqual({
      "card-1": "마크다운 포함 조언",
    });
  });

  it("Gemini API 반환 형식이 올바른 JSON 배열이 아니면 에러를 던져야 한다", async () => {
    const sampleEvaluations: CardEvaluation[] = [
      {
        card: {
          id: "card-1",
          name: "카드 1",
          issuer: "A사",
          cardType: "credit",
          annualFee: 10000,
          excludedCategories: [],
          tiers: [],
        },
        meetsMinimum: true,
        tierIndex: 0,
        totalMonthlyBenefit: 5000,
        netMonthlyBenefit: 4000,
        breakdown: [],
      },
    ];

    // 잘못된 JSON 구조 응답
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => "invalid json content",
      },
    });

    await expect(getCardAdvice("dummy-key", sampleEvaluations, [])).rejects.toThrow("AI 조언 결과 형식이 올바르지 않습니다.");
  });
});
