import type { Benefit, BenefitType, Card } from "@/types/card";
import type { CatalogEntry } from "@/types/catalog";
import { catalogEntryToCard } from "@/lib/cardConverter";
import { formatWon } from "@/lib/format";

export const CATEGORY_LABELS: Record<string, string> = {
  convenience: "편의점",
  cafe: "카페/디저트",
  transport: "대중교통",
  mobile: "통신비",
  onlineShopping: "온라인쇼핑",
  mart: "대형마트/슈퍼",
  dining: "외식",
  culture: "영화/공연/OTT",
  gas: "주유",
  etc: "그 외 일반가맹점",
};

export const BENEFIT_TYPE_LABELS: Record<BenefitType, string> = {
  discount: "할인",
  point: "적립",
  cashback: "캐시백",
};

export interface SpendingTip {
  category: string;
  categoryLabel: string;
  ratePercent: number;
  benefitType: BenefitType;
  benefitTypeLabel: string;
  estimatedBenefit: number;
  tipMessage: string;
  rawBenefitDescription?: string;
}

export interface PerformanceDdayInfo {
  /** 오늘을 포함하여 말일까지 남은 소비 가능 일수 (최소 1일) */
  daysRemaining: number;
  /** 말일까지 남은 D-Day 숫자 (말일 당일은 0) */
  dDay: number;
  /** 화면 표시용 D-Day 텍스트 (예: '말일 D-3', '말일 D-Day (오늘 마감)') */
  dDayLabel: string;
  /** 남은 실적을 채우기 위한 일평균 권장 소비액 (원) */
  dailyRecommendedSpend: number;
  /** 해당 카드에서 실적을 채우기 가장 유리한 추천 소비 팁 */
  recommendedTip: SpendingTip | null;
  /** 말일이 임박했는지 여부 (D-5 이하) */
  isMonthEndUrgent: boolean;
}

/**
 * 기준 일자의 월 말일까지 남은 D-Day 및 오늘 포함 잔여 일수를 계산합니다.
 * @param currentDate 기준 일자 (생략 시 현재 시각)
 */
export function calculateRemainingDaysInMonth(currentDate?: Date | string | number): {
  dDay: number;
  daysRemaining: number;
  dDayLabel: string;
  isMonthEndUrgent: boolean;
} {
  const date = currentDate ? new Date(currentDate) : new Date();
  const year = date.getFullYear();
  const month = date.getMonth();
  const currentDay = date.getDate();

  // 해당 월의 마지막 날짜 (예: 10월 -> 31)
  const lastDay = new Date(year, month + 1, 0).getDate();

  const dDay = Math.max(0, lastDay - currentDay);
  // 오늘 포함 잔여 소비 가능 일수 (말일 당일에도 당일 1일 남아있음)
  const daysRemaining = Math.max(1, lastDay - currentDay + 1);

  const dDayLabel = dDay === 0 ? "말일 D-Day (오늘 마감)" : `말일 D-${dDay}`;
  const isMonthEndUrgent = dDay <= 5;

  return {
    dDay,
    daysRemaining,
    dDayLabel,
    isMonthEndUrgent,
  };
}

/**
 * 남은 부족 실적과 잔여 일수를 기반으로 일평균 권장 소비액을 계산합니다.
 * @param remainingAmount 다음 실적 달성까지 남은 금액 (원)
 * @param daysRemaining 오늘 포함 잔여 소비 일수
 */
export function calculateDailyRecommendedSpend(
  remainingAmount: number,
  daysRemaining: number,
): number {
  if (remainingAmount <= 0) return 0;
  const safeDays = Math.max(1, daysRemaining);
  return Math.ceil(remainingAmount / safeDays);
}

/**
 * 주어진 카드 정보에서 혜택 목록을 추출합니다.
 */
function extractBenefitsFromCard(cardOrEntry: Card | CatalogEntry): Benefit[] {
  if ("tiers" in cardOrEntry && Array.isArray(cardOrEntry.tiers)) {
    // Card 인터페이스인 경우
    const benefits: Benefit[] = [];
    for (const tier of cardOrEntry.tiers) {
      if (Array.isArray(tier.benefits)) {
        benefits.push(...tier.benefits);
      }
    }
    return benefits;
  }

  // CatalogEntry 인터페이스인 경우
  const converted = catalogEntryToCard(cardOrEntry as CatalogEntry);
  return converted.tiers?.[0]?.benefits || [];
}

/**
 * 카드의 혜택 중 가장 할인/적립률이 높아 실적을 채우기에 가장 유리한 카테고리 소비 추천 팁을 추출합니다.
 * @param cardOrEntry 카드 객체 (Card) 또는 카탈로그 엔트리 (CatalogEntry)
 * @param remainingAmount 부족 실적 금액 (원)
 */
export function getRecommendedSpendingTip(
  cardOrEntry?: Card | CatalogEntry,
  remainingAmount = 0,
): SpendingTip | null {
  if (!cardOrEntry) return null;

  const benefits = extractBenefitsFromCard(cardOrEntry);
  if (!benefits || benefits.length === 0) return null;

  // 1순위: 혜택률 높은 순
  // 2순위: 동일 혜택률일 때 'etc'보다 특화 카테고리(외식, 쇼핑 등) 우선
  // 3순위: 월 한도(capPerMonth)가 큰 순
  const sorted = [...benefits].sort((a, b) => {
    if (b.rate !== a.rate) {
      return b.rate - a.rate;
    }
    if (a.category === "etc" && b.category !== "etc") return 1;
    if (b.category === "etc" && a.category !== "etc") return -1;
    return (b.capPerMonth || 999999) - (a.capPerMonth || 999999);
  });

  const best = sorted[0];
  if (!best || best.rate <= 0) return null;

  const categoryLabel = CATEGORY_LABELS[best.category] || best.category;
  const ratePercent = Number((best.rate * 100).toFixed(1));
  const benefitTypeLabel = BENEFIT_TYPE_LABELS[best.type] || "할인";

  // 예상 혜택 계산 (남은 실적 소비 시 받을 수 있는 혜택, 한도 내)
  const rawBenefit = Math.round(remainingAmount * best.rate);
  const estimatedBenefit = best.capPerMonth
    ? Math.min(rawBenefit, best.capPerMonth)
    : rawBenefit;

  const tipMessage =
    remainingAmount > 0 && estimatedBenefit > 0
      ? `부족한 실적을 채울 때 [${categoryLabel}]에서 소비하면 ${ratePercent}% ${benefitTypeLabel}(약 ${formatWon(estimatedBenefit)})을 챙길 수 있어 가장 유리해요!`
      : `이 카드는 [${categoryLabel}] 카테고리에서 ${ratePercent}% ${benefitTypeLabel} 혜택이 가장 커요.`;

  return {
    category: best.category,
    categoryLabel,
    ratePercent,
    benefitType: best.type,
    benefitTypeLabel,
    estimatedBenefit,
    tipMessage,
    rawBenefitDescription: best.description,
  };
}

/**
 * 실적 달성 현황 및 카드 정보를 종합하여 마감 D-Day 및 소비 추천 가이드 정보를 반환합니다.
 * @param remainingAmount 다음 실적 달성까지 남은 금액 (원)
 * @param cardOrEntry 카드 객체 또는 카탈로그 정보
 * @param currentDate 기준 일자 (생략 시 현재 시각)
 */
export function getPerformanceDdayInfo(
  remainingAmount: number,
  cardOrEntry?: Card | CatalogEntry,
  currentDate?: Date | string | number,
): PerformanceDdayInfo {
  const { dDay, daysRemaining, dDayLabel, isMonthEndUrgent } =
    calculateRemainingDaysInMonth(currentDate);

  const dailyRecommendedSpend = calculateDailyRecommendedSpend(
    remainingAmount,
    daysRemaining,
  );

  const recommendedTip = getRecommendedSpendingTip(
    cardOrEntry,
    remainingAmount,
  );

  return {
    daysRemaining,
    dDay,
    dDayLabel,
    dailyRecommendedSpend,
    recommendedTip,
    isMonthEndUrgent,
  };
}
