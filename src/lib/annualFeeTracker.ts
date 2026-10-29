import type { Card } from "@/types/card";
import type { CatalogEntry } from "@/types/catalog";
import { catalogEntryToCard } from "@/lib/cardConverter";
import {
  calculateAnnualNetBenefit,
  estimateMonthlyBenefitFromCard,
} from "@/lib/benefitCalculator";
import {
  calculatePerformanceProgress,
  getCardPerformanceTiers,
} from "@/lib/performanceTracker";
import {
  type MyCardMeta,
  normalizeAnnualFeeMonth,
  normalizeExpiryDate,
} from "@/lib/myCards";
import { formatWon } from "@/lib/format";

export interface AnnualFeeDdayInfo {
  /** 연회비 청구월 (1 ~ 12) */
  annualFeeMonth: number;
  /** 차기 연회비 청구 기준일 (YYYY-MM-DD, 해당 청구월 1일) */
  nextBillingDate: string;
  /** 차기 청구일까지 남은 일수 (당일이면 0) */
  dDay: number;
  /** 화면 표시용 D-Day 뱃지 라벨 */
  dDayLabel: string;
  /** 연회비 청구 30일 전 알림 대상 여부 (0 <= dDay <= 30) */
  isUrgent: boolean;
  /** 청구 임박 시 사용자 안내 메시지 */
  alertMessage: string | null;
}

export interface ExpiryDdayInfo {
  /** 정규화된 유효기간 (MM/YY) */
  expiryDate: string;
  /** 만료 연도 (4자리, 예: 2029) */
  expiryYear: number;
  /** 만료 월 (1 ~ 12) */
  expiryMonth: number;
  /** 만료일(해당 월 말일)까지 남은 일수 (만료 시 음수) */
  dDay: number;
  /** 화면 표시용 유효기간 상태 라벨 */
  dDayLabel: string;
  /** 이미 만료되었는지 여부 */
  isExpired: boolean;
  /** 만료 60일 이내 임박 여부 */
  isExpiringSoon: boolean;
}

export type RenewalDecisionType = "keep" | "review";

export interface CardRenewalEvaluation {
  /** 갱신/해지 의사결정 코드 ('keep': 유지 권장, 'review': 해지/교체 검토) */
  decision: RenewalDecisionType;
  /** 화면 표시용 의사결정 라벨 ('유지 권장' | '해지/교체 검토') */
  decisionLabel: string;
  /** 평가에 사용된 월 지출액 (원) */
  monthlySpend: number;
  /** 월간 예상 혜택 금액 (원) */
  monthlyBenefit: number;
  /** 연간 누적 예상 혜택 금액 (원, 월 혜택 * 12) */
  annualBenefit: number;
  /** 카드 연회비 (원) */
  annualFee: number;
  /** 연간 순혜택 (원, 연간 누적 혜택 - 연회비) */
  annualNetBenefit: number;
  /** 연회비 대비 연간 혜택 배수 (연회비 0원일 때 null) */
  roiRatio: number | null;
  /** 전월 최소 실적 달성 여부 */
  meetsMinimumSpend: boolean;
  /** 의사결정 근거 상세 안내 텍스트 */
  reasonText: string;
  /** 연회비 청구월 D-Day 정보 */
  annualFeeDday: AnnualFeeDdayInfo | null;
  /** 유효기간 만료 D-Day 정보 */
  expiryDday: ExpiryDdayInfo | null;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * 연회비 청구월(1~12)을 기준으로 차기 청구일(해당 월 1일)까지의 D-Day 및 30일 이내 임박 여부를 계산합니다.
 * @param annualFeeMonth 연회비 청구월 (1 ~ 12)
 * @param currentDate 기준 일자 (생략 시 현재 시각)
 */
export function calculateAnnualFeeDday(
  annualFeeMonth?: number,
  currentDate?: Date | string | number,
): AnnualFeeDdayInfo | null {
  const validMonth = normalizeAnnualFeeMonth(annualFeeMonth);
  if (!validMonth) return null;

  const base = currentDate !== undefined ? new Date(currentDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const todayMidnight = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());
  let targetYear = base.getFullYear();
  const targetMonthIndex = validMonth - 1;

  let targetMidnight = Date.UTC(targetYear, targetMonthIndex, 1);
  if (targetMidnight < todayMidnight) {
    targetYear += 1;
    targetMidnight = Date.UTC(targetYear, targetMonthIndex, 1);
  }

  const dDay = Math.max(0, Math.round((targetMidnight - todayMidnight) / MS_PER_DAY));
  const isUrgent = dDay <= 30;
  const nextBillingDate = `${targetYear}-${String(validMonth).padStart(2, "0")}-01`;

  const dDayLabel =
    dDay === 0
      ? `연회비 청구 D-Day (${validMonth}월)`
      : `연회비 청구 D-${dDay} (${validMonth}월)`;

  const alertMessage = isUrgent
    ? dDay === 0
      ? `오늘(${validMonth}월 1일)은 연회비 청구 기준일입니다. 카드 유지 또는 해지 여부를 확인하세요.`
      : `연회비 청구월(${validMonth}월)이 ${dDay}일 남았습니다. 청구 전 갱신/해지 여부를 확인하세요.`
    : null;

  return {
    annualFeeMonth: validMonth,
    nextBillingDate,
    dDay,
    dDayLabel,
    isUrgent,
    alertMessage,
  };
}

/**
 * 유효기간(MM/YY)을 기준으로 해당 월 말일까지의 만료 D-Day를 계산합니다.
 * @param expiryDate 카드 유효기간 문자열 (예: "05/29", "2029-05")
 * @param currentDate 기준 일자 (생략 시 현재 시각)
 */
export function calculateExpiryDday(
  expiryDate?: string,
  currentDate?: Date | string | number,
): ExpiryDdayInfo | null {
  const normalized = normalizeExpiryDate(expiryDate);
  if (!normalized) return null;

  const base = currentDate !== undefined ? new Date(currentDate) : new Date();
  if (Number.isNaN(base.getTime())) return null;

  const [mmStr, yyStr] = normalized.split("/");
  const expiryMonth = parseInt(mmStr, 10);
  const expiryYear = 2000 + parseInt(yyStr, 10);

  // 해당 유효기간 월의 마지막 날짜 (UTC 기준)
  const lastDayOfExpiryMonth = new Date(Date.UTC(expiryYear, expiryMonth, 0)).getUTCDate();
  const expiryMidnight = Date.UTC(expiryYear, expiryMonth - 1, lastDayOfExpiryMonth);
  const todayMidnight = Date.UTC(base.getFullYear(), base.getMonth(), base.getDate());

  const dDay = Math.round((expiryMidnight - todayMidnight) / MS_PER_DAY);
  const isExpired = dDay < 0;
  const isExpiringSoon = dDay >= 0 && dDay <= 60;

  let dDayLabel: string;
  if (isExpired) {
    dDayLabel = `유효기간 만료 (${normalized})`;
  } else if (dDay === 0) {
    dDayLabel = `유효기간 만료 D-Day (${normalized})`;
  } else if (isExpiringSoon) {
    dDayLabel = `만료 임박 D-${dDay} (${normalized})`;
  } else {
    dDayLabel = `유효기간 ${normalized}`;
  }

  return {
    expiryDate: normalized,
    expiryYear,
    expiryMonth,
    dDay,
    dDayLabel,
    isExpired,
    isExpiringSoon,
  };
}

export interface EvaluateCardRenewalParams {
  /** 평가 대상 카드 (CatalogEntry 또는 Card) */
  entry: CatalogEntry | Card;
  /** 월 평균 지출액 (원) */
  monthlySpend: number;
  /** 월 예상 혜택 직접 지정값 (생략 시 카드 혜택 및 실적 달성 여부로 자동 산출) */
  monthlyBenefitOverride?: number;
  /** 내 카드 메타데이터 (발급월, 연회비 청구월, 유효기간) */
  meta?: MyCardMeta;
  /** 기준 일자 (테스트용) */
  currentDate?: Date | string | number;
}

/**
 * 연간 누적 혜택 대비 연회비 손익 분석 및 청구 D-Day를 종합하여
 * '유지 권장' vs '해지/교체 검토' 의사결정 보조 지표를 산출합니다.
 */
export function evaluateCardRenewalDecision({
  entry,
  monthlySpend,
  monthlyBenefitOverride,
  meta,
  currentDate,
}: EvaluateCardRenewalParams): CardRenewalEvaluation {
  const safeSpend = Math.max(0, Math.floor(monthlySpend || 0));
  const annualFee = Math.max(0, Math.floor(entry.annualFee ?? 0));

  let cardObj: Card;
  let tiers: number[];

  if ("tiers" in entry && Array.isArray(entry.tiers)) {
    cardObj = entry;
    tiers = entry.tiers.map((t) => t.minSpend).filter((m) => m > 0);
  } else {
    const catalogEntry = entry as CatalogEntry;
    cardObj = catalogEntryToCard(catalogEntry);
    tiers = getCardPerformanceTiers(catalogEntry);
  }

  const progress = calculatePerformanceProgress(safeSpend, tiers);
  const meetsMinimumSpend = progress.status !== "unmet";

  let monthlyBenefit: number;
  if (monthlyBenefitOverride !== undefined) {
    monthlyBenefit = Math.max(0, Math.round(monthlyBenefitOverride));
  } else if (!meetsMinimumSpend) {
    monthlyBenefit = 0;
  } else {
    monthlyBenefit = estimateMonthlyBenefitFromCard(cardObj, safeSpend);
  }

  const annualBenefit = monthlyBenefit * 12;
  const annualNetBenefit = calculateAnnualNetBenefit(monthlyBenefit, annualFee);
  const roiRatio =
    annualFee > 0 ? Number((annualBenefit / annualFee).toFixed(1)) : null;

  // 의사결정 판정:
  // 1) 연회비가 있는 카드: 연간 누적 혜택이 연회비보다 큰 경우(연간 순혜택 > 0) '유지 권장', 아니면 '해지/교체 검토'
  // 2) 연회비가 없는 카드(0원): 최소 실적을 충족하고 혜택이 발생하거나 무실적 카드면 '유지 권장', 실적 미달로 혜택이 0원이면 '해지/교체 검토'
  let decision: RenewalDecisionType;
  let reasonText: string;

  if (annualFee > 0) {
    if (annualNetBenefit > 0) {
      decision = "keep";
      reasonText = `연간 예상 혜택(${formatWon(annualBenefit)})이 연회비(${formatWon(annualFee)})보다 ${formatWon(annualNetBenefit)} 많아 유지를 권장합니다.`;
    } else {
      decision = "review";
      if (!meetsMinimumSpend) {
        reasonText = `현재 월 사용액이 최소 실적에 미달하여 예상 혜택이 0원입니다. 연회비(${formatWon(annualFee)}) 손실 방지를 위해 해지 또는 교체를 검토해 보세요.`;
      } else {
        reasonText = `연간 예상 혜택(${formatWon(annualBenefit)})이 연회비(${formatWon(annualFee)})에 미치지 못해(순손익 ${formatWon(annualNetBenefit)}) 해지 또는 교체를 검토해 보세요.`;
      }
    }
  } else {
    if (meetsMinimumSpend) {
      decision = "keep";
      reasonText = `연회비 부담 없이 연간 약 ${formatWon(annualBenefit)}의 혜택을 받을 수 있어 유지를 권장합니다.`;
    } else {
      decision = "review";
      reasonText = `연회비는 없으나 전월 실적 미달로 혜택을 받지 못하고 있습니다. 사용액을 늘리거나 주력 카드 교체를 검토해 보세요.`;
    }
  }

  const annualFeeDday = calculateAnnualFeeDday(meta?.annualFeeMonth, currentDate);
  const expiryDday = calculateExpiryDday(meta?.expiryDate, currentDate);

  return {
    decision,
    decisionLabel: decision === "keep" ? "유지 권장" : "해지/교체 검토",
    monthlySpend: safeSpend,
    monthlyBenefit,
    annualBenefit,
    annualFee,
    annualNetBenefit,
    roiRatio,
    meetsMinimumSpend,
    reasonText,
    annualFeeDday,
    expiryDday,
  };
}
