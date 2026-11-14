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
  const parsedDate =
    currentDate !== undefined && currentDate !== null
      ? new Date(currentDate)
      : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
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

export interface SpendingTipOptions {
  /** 현재 누적 지출액 (원) — 미전달 시 가장 낮은 기본 실적 구간 기준 */
  currentSpend?: number;
  /** 명시적 실적 구간 인덱스 (0-based) */
  tierIndex?: number;
}

/**
 * 카드의 실적 구간(tiers) 중 현재 적용 대상 구간의 혜택 목록을 추출합니다.
 */
function selectTargetTierBenefits(
  card: Card,
  options?: number | SpendingTipOptions,
): Benefit[] {
  const tiers = card.tiers;
  if (!Array.isArray(tiers) || tiers.length === 0) return [];

  const resolvedOptions: SpendingTipOptions =
    typeof options === "number" ? { currentSpend: options } : (options ?? {});

  if (
    resolvedOptions.tierIndex !== undefined &&
    Number.isInteger(resolvedOptions.tierIndex) &&
    resolvedOptions.tierIndex >= 0 &&
    resolvedOptions.tierIndex < tiers.length
  ) {
    const explicitTier = tiers[resolvedOptions.tierIndex];
    return Array.isArray(explicitTier?.benefits) ? explicitTier.benefits : [];
  }

  const sortedTiers = [...tiers].sort((a, b) => a.minSpend - b.minSpend);

  if (
    resolvedOptions.currentSpend !== undefined &&
    Number.isFinite(resolvedOptions.currentSpend)
  ) {
    const spend = Math.max(0, resolvedOptions.currentSpend);
    let matchedTier = sortedTiers[0];
    for (const tier of sortedTiers) {
      if (tier.minSpend <= spend) {
        matchedTier = tier;
      } else {
        break;
      }
    }
    return Array.isArray(matchedTier?.benefits) ? matchedTier.benefits : [];
  }

  // 기준 지출액 미전달 시 가장 낮은 기본 실적 구간의 혜택만 사용 (상위 구간 과장 방지)
  return Array.isArray(sortedTiers[0]?.benefits) ? sortedTiers[0].benefits : [];
}

/**
 * 주어진 카드 정보에서 현재 적용 구간의 혜택 목록을 추출합니다.
 */
function extractBenefitsFromCard(
  cardOrEntry: Card | CatalogEntry,
  options?: number | SpendingTipOptions,
): Benefit[] {
  if ("tiers" in cardOrEntry && Array.isArray(cardOrEntry.tiers)) {
    return selectTargetTierBenefits(cardOrEntry, options);
  }

  const converted = catalogEntryToCard(cardOrEntry as CatalogEntry);
  return selectTargetTierBenefits(converted, options);
}

/**
 * 카드의 현재 적용 구간 혜택 중 가장 할인/적립률이 높아 실적을 채우기에 유리한 카테고리 소비 추천 팁을 추출합니다.
 * @param cardOrEntry 카드 객체 (Card) 또는 카탈로그 엔트리 (CatalogEntry)
 * @param remainingAmount 부족 실적 금액 (원)
 * @param currentSpendOrOptions 현재 누적 지출액 또는 구간 선택 옵션
 */
export function getRecommendedSpendingTip(
  cardOrEntry?: Card | CatalogEntry,
  remainingAmount = 0,
  currentSpendOrOptions?: number | SpendingTipOptions,
): SpendingTip | null {
  if (!cardOrEntry) return null;

  const benefits = extractBenefitsFromCard(cardOrEntry, currentSpendOrOptions);
  if (!benefits || benefits.length === 0) return null;

  // 1순위: 혜택률 높은 순
  // 2순위: 동일 혜택률일 때 'etc'보다 특화 카테고리(외식, 쇼핑 등) 우선
  // 3순위: 월 한도(capPerMonth)가 큰 순 (undefined는 무제한으로 간주, 0원은 0원으로 취급)
  const sorted = [...benefits].sort((a, b) => {
    if (b.rate !== a.rate) {
      return b.rate - a.rate;
    }
    if (a.category === "etc" && b.category !== "etc") return 1;
    if (b.category === "etc" && a.category !== "etc") return -1;
    const capA =
      a.capPerMonth !== undefined ? a.capPerMonth : Number.MAX_SAFE_INTEGER;
    const capB =
      b.capPerMonth !== undefined ? b.capPerMonth : Number.MAX_SAFE_INTEGER;
    return capB - capA;
  });

  const best = sorted[0];
  if (!best || best.rate <= 0) return null;

  const categoryLabel = CATEGORY_LABELS[best.category] || best.category;
  const ratePercent = Number((best.rate * 100).toFixed(1));
  const benefitTypeLabel = BENEFIT_TYPE_LABELS[best.type] || "할인";

  // 예상 혜택 계산 (남은 실적 소비 시 받을 수 있는 혜택, 월 한도 0원 포함 명시적 한도 내)
  const safeRemaining =
    Number.isFinite(remainingAmount) && remainingAmount > 0
      ? remainingAmount
      : 0;
  const rawBenefit = Math.round(safeRemaining * best.rate);
  const estimatedBenefit =
    best.capPerMonth !== undefined
      ? Math.min(rawBenefit, Math.max(0, best.capPerMonth))
      : rawBenefit;

  const tipMessage =
    safeRemaining > 0 && estimatedBenefit > 0
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
 * @param currentSpend 현재 누적 지출액 (원, 적용 구간 판별용)
 */
export function getPerformanceDdayInfo(
  remainingAmount: number,
  cardOrEntry?: Card | CatalogEntry,
  currentDate?: Date | string | number,
  currentSpend?: number,
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
    currentSpend,
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
