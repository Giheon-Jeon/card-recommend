import type { CatalogEntry } from "@/types/catalog";
import type { Card } from "@/types/card";

export type ExclusionCategoryId =
  | "tax"
  | "apartment"
  | "voucher"
  | "insurance"
  | "tuition"
  | "interestFree"
  | "publicTransit"
  | "feeAndLoan";

export type ExclusionScope = "performance" | "benefit" | "both";

export interface ExclusionItem {
  id: ExclusionCategoryId;
  label: string;
  shortLabel: string;
  scope: ExclusionScope;
  description: string;
  warningLevel: "high" | "medium" | "low";
  matchedKeywords?: string[];
}

export interface CardExclusionResult {
  /** 카드 텍스트에서 명시적으로 감지된 제외 항목 */
  detectedExclusions: ExclusionItem[];
  /** 표준 신용/체크카드 공통 기본 제외 항목 (텍스트 언급 유무 무관) */
  standardExclusions: ExclusionItem[];
  /** 중복 제거된 전체 제외 항목 */
  allExclusions: ExclusionItem[];
  /** 사용자가 가장 흔히 착오하는 고위험군(상품권, 세금, 아파트관리비) 포함 여부 */
  hasHighRiskExclusions: boolean;
  /** 안내 요약 문구 */
  summaryNotice: string;
}

interface ExclusionDefinition {
  id: ExclusionCategoryId;
  label: string;
  shortLabel: string;
  scope: ExclusionScope;
  description: string;
  warningLevel: "high" | "medium" | "low";
  keywords: string[];
}

/**
 * 국내 카드사 표준 실적/혜택 제외 정의 목록
 */
export const EXCLUSION_DEFINITIONS: ExclusionDefinition[] = [
  {
    id: "tax",
    label: "국세·지방세·공과금",
    shortLabel: "세금·공과금",
    scope: "both",
    description: "국세, 지방세, 관세, 수도/전기/도시가스 요금, 과태료 등은 실적 및 할인에서 제외됩니다.",
    warningLevel: "high",
    keywords: [
      "국세",
      "지방세",
      "관세",
      "공과금",
      "전기요금",
      "도시가스",
      "수도요금",
      "과태료",
      "범칙금",
      "벌금",
      "환경개선부담금",
      "세금",
    ],
  },
  {
    id: "apartment",
    label: "아파트 관리비",
    shortLabel: "아파트관리비",
    scope: "both",
    description: "아파트 관리비 납부금액은 대부분의 카드에서 전월 실적 및 혜택 적용이 제외됩니다.",
    warningLevel: "high",
    keywords: ["아파트관리비", "아파트 관리비", "관리비"],
  },
  {
    id: "voucher",
    label: "상품권·선불충전(상테크)",
    shortLabel: "상품권·선불금",
    scope: "both",
    description: "상품권, 기프트카드, 선불카드 및 카카오페이/토스머니 등 선불전자지급수단 충전금은 제외됩니다.",
    warningLevel: "high",
    keywords: [
      "상품권",
      "기프트카드",
      "선불카드",
      "선불전자지급수단",
      "포인트충전",
      "사이버머니",
      "선불 충전",
      "쿠폰 구매",
      "상품권 구매",
    ],
  },
  {
    id: "insurance",
    label: "4대 사회보험",
    shortLabel: "4대보험",
    scope: "performance",
    description: "국민연금, 건강보험, 고용보험, 산재보험료 납부액은 전월 이용실적 산정에서 제외됩니다.",
    warningLevel: "medium",
    keywords: [
      "4대보험",
      "4대 사회보험",
      "국민연금",
      "건강보험",
      "고용보험",
      "산재보험",
      "사회보험",
    ],
  },
  {
    id: "tuition",
    label: "초중고 납입금·대학등록금",
    shortLabel: "학교납입금",
    scope: "performance",
    description: "초·중·고교 납입금(수업료/급식비) 및 대학/대학원 등록금은 전월 실적에서 제외됩니다.",
    warningLevel: "medium",
    keywords: [
      "초중고",
      "초·중·고",
      "대학등록금",
      "대학 등록금",
      "등록금",
      "스쿨뱅킹",
      "학부모부담금",
      "수업료",
      "학비",
    ],
  },
  {
    id: "interestFree",
    label: "무이자할부 이용금액",
    shortLabel: "무이자할부",
    scope: "both",
    description: "무이자할부(슬림할부 포함) 결제 건은 할인·적립 혜택 및 실적 인정에서 제외될 수 있습니다.",
    warningLevel: "medium",
    keywords: [
      "무이자할부",
      "무이자 할부",
      "무이자 이용금액",
      "무이자 결제",
    ],
  },
  {
    id: "publicTransit",
    label: "대중교통/철도 제외",
    shortLabel: "교통비 제외",
    scope: "performance",
    description: "해당 카드의 경우 시내버스, 지하철 또는 철도(SRT/KTX) 결제액이 전월 실적에 미반영됩니다.",
    warningLevel: "low",
    keywords: [
      "대중교통 제외",
      "철도 제외",
      "고속버스 제외",
      "교통요금 제외",
    ],
  },
  {
    id: "feeAndLoan",
    label: "연회비·금융수수료·카드론",
    shortLabel: "수수료·대출",
    scope: "both",
    description: "카드 연회비, 제수수료, 이자, 단기카드대출(현금서비스), 장기카드대출(카드론) 등은 제외됩니다.",
    warningLevel: "low",
    keywords: [
      "연회비",
      "현금서비스",
      "카드론",
      "단기카드대출",
      "장기카드대출",
      "수수료",
      "이자",
      "연체료",
    ],
  },
];

/**
 * 기본 신용/체크카드 표준 제외 3종 (세금, 관리비, 상품권)
 */
export const STANDARD_EXCLUSIONS: ExclusionItem[] = [
  {
    id: "tax",
    label: "국세·지방세·공과금",
    shortLabel: "세금·공과금",
    scope: "both",
    description: "국세, 지방세, 관세, 수도/전기/도시가스 요금 등은 실적 및 할인에서 제외됩니다.",
    warningLevel: "high",
  },
  {
    id: "apartment",
    label: "아파트 관리비",
    shortLabel: "아파트관리비",
    scope: "both",
    description: "아파트 관리비 납부금액은 대부분의 카드에서 전월 실적 및 혜택 적용이 제외됩니다.",
    warningLevel: "high",
  },
  {
    id: "voucher",
    label: "상품권·선불충전(상테크)",
    shortLabel: "상품권·선불금",
    scope: "both",
    description: "상품권 구매 및 선불전자지급수단 충전 금액은 실적 인정 및 혜택 대상에서 제외됩니다.",
    warningLevel: "high",
  },
];

/**
 * 텍스트(혜택 요약, 실적 기준, 비고 등)에서 실적/할인 제외 키워드를 파싱합니다.
 */
export function parseCardExclusions(
  benefitSummary?: string,
  performanceStandard?: string,
  notes?: string
): CardExclusionResult {
  const combinedText = [benefitSummary, performanceStandard, notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const detected: ExclusionItem[] = [];

  for (const def of EXCLUSION_DEFINITIONS) {
    const matchedKeywords: string[] = [];
    for (const kw of def.keywords) {
      if (combinedText.includes(kw.toLowerCase())) {
        matchedKeywords.push(kw);
      }
    }

    if (matchedKeywords.length > 0) {
      detected.push({
        id: def.id,
        label: def.label,
        shortLabel: def.shortLabel,
        scope: def.scope,
        description: def.description,
        warningLevel: def.warningLevel,
        matchedKeywords,
      });
    }
  }

  // 중복 없이 전체 합치기 (detected 우선)
  const allMap = new Map<ExclusionCategoryId, ExclusionItem>();
  for (const item of detected) {
    allMap.set(item.id, item);
  }
  for (const std of STANDARD_EXCLUSIONS) {
    if (!allMap.has(std.id)) {
      allMap.set(std.id, std);
    }
  }
  const allExclusions = Array.from(allMap.values());

  const hasHighRiskExclusions = allExclusions.some((item) => item.warningLevel === "high");

  const summaryNotice =
    detected.length > 0
      ? `주의: ${detected.map((d) => d.shortLabel).join(", ")} 항목은 실적 및 할인에서 제외됩니다.`
      : "주의: 국세, 지방세, 아파트관리비, 상품권 등은 표준 약관에 따라 실적 산정에서 제외됩니다.";

  return {
    detectedExclusions: detected,
    standardExclusions: STANDARD_EXCLUSIONS,
    allExclusions,
    hasHighRiskExclusions,
    summaryNotice,
  };
}

/**
 * CatalogEntry 객체로부터 제외 항목 분석 결과를 추출합니다.
 */
export function getExclusionsForCatalogEntry(entry: CatalogEntry): CardExclusionResult {
  return parseCardExclusions(entry.benefitSummary, entry.performanceStandard);
}

/**
 * Card 객체로부터 제외 항목 분석 결과를 추출합니다.
 */
export function getExclusionsForCard(card: Card): CardExclusionResult {
  const benefitTexts = card.tiers.flatMap((t) => t.benefits.map((b) => b.description || ""));
  return parseCardExclusions(benefitTexts.join(" "), undefined, card.notes);
}

/**
 * 지출 카테고리별 실적 제외 주의 안내 문구를 반환합니다.
 */
export function getCategoryExclusionNotice(categoryId: string): string | null {
  if (categoryId === "etc") {
    return "국세, 지방세, 아파트관리비, 상품권 구매는 대부분의 카드에서 실적 산정 및 혜택에서 제외됩니다.";
  }
  return null;
}
