import type { CatalogEntry } from "@/types/catalog";

export type PerformanceStatus = "unmet" | "met" | "max" | "none";

export interface PerformanceProgress {
  /** 현재 지출 금액 */
  currentSpend: number;
  /** 파싱된 전월 실적 구간 배열 (오름차순, 원 단위) */
  tiers: number[];
  /** 현재 달성한 구간 인덱스 (-1: 미달성, 0: 1구간 달성, 1: 2구간 달성 ...) */
  currentTierIndex: number;
  /** 실적 상태 구분 ('unmet': 최소실적 미달성, 'met': 1구간 이상 달성, 'max': 최고혜택 달성, 'none': 무실적) */
  status: PerformanceStatus;
  /** 화면 표시용 상태 라벨 */
  statusLabel: string;
  /** 다음 달성 목표 실적 금액 (최고 혜택 달성 또는 무실적인 경우 null) */
  nextTierAmount: number | null;
  /** 다음 실적 구간까지 남은 금액 (원, 음수 없음) */
  remainingToNextTier: number;
  /** 전체 최고 실적 기준 대비 현재 달성 퍼센트 (0 ~ 100) */
  progressPercent: number;
  /** 직전 또는 다음 목표 구간 기준 달성 퍼센트 */
  targetProgressPercent: number;
  /** 현재 목표 금액 (미달성 시 최소 실적, 달성 시 다음 실적, 최대 달성 시 최고 실적) */
  targetTierAmount: number;
}

/**
 * 전월 실적 기준 텍스트를 파싱하여 원(KRW) 단위의 오름차순 실적 구간 배열을 추출합니다.
 * @param standardText 카드 전월 실적 조건 텍스트 (예: '전월 30만원 이상', '30만/70만/100만', '실적조건 없음')
 * @param fallbackCategory 카드 유형 ('체크', '신용' 등) - 텍스트가 없거나 파싱 불가 시 기본 구간 적용
 */
export function parsePerformanceTiers(
  standardText?: string,
  fallbackCategory?: string,
): number[] {
  if (!standardText || !standardText.trim()) {
    return fallbackCategory === "체크"
      ? [200000, 500000, 800000]
      : [300000, 700000, 1000000];
  }

  const normalized = standardText.trim().toLowerCase();

  // '무실적', '실적조건 없음', '0원' 등 무조건 혜택 카드 감지
  if (
    normalized.includes("조건 없음") ||
    normalized.includes("조건없음") ||
    normalized.includes("무실적") ||
    normalized.includes("실적 무관") ||
    normalized.includes("실적무관") ||
    normalized.includes("기준 없음") ||
    normalized.includes("기준없음") ||
    normalized === "0원" ||
    normalized === "0"
  ) {
    return [];
  }

  const detectedAmounts = new Set<number>();

  // 1. 'X만(원)' 패턴 매칭 (예: 30만, 70만원, 1.5만원, 100만)
  const manRegex = /(\d+(?:\.\d+)?)\s*만(?:원)?/g;
  let match: RegExpExecArray | null;
  while ((match = manRegex.exec(standardText)) !== null) {
    const value = Math.round(parseFloat(match[1]) * 10000);
    if (value > 0) {
      detectedAmounts.add(value);
    }
  }

  // 2. 'X,XXX원' 또는 일반 원단위 금액 매칭 (예: 300,000원, 500000원)
  const wonRegex = /(\d{1,3}(?:,\d{3})+|\d{5,})\s*원/g;
  while ((match = wonRegex.exec(standardText)) !== null) {
    const rawNumber = match[1].replace(/,/g, "");
    const value = parseInt(rawNumber, 10);
    if (value > 0) {
      detectedAmounts.add(value);
    }
  }

  const sortedTiers = Array.from(detectedAmounts).sort((a, b) => a - b);

  // 파싱된 금액이 전혀 없는 경우 기본값 제공
  if (sortedTiers.length === 0) {
    return fallbackCategory === "체크"
      ? [200000, 500000, 800000]
      : [300000, 700000, 1000000];
  }

  return sortedTiers;
}

/**
 * CatalogEntry 객체로부터 전월 실적 구간 배열을 추출합니다.
 */
export function getCardPerformanceTiers(entry: CatalogEntry): number[] {
  return parsePerformanceTiers(entry.performanceStandard, entry.category);
}

/**
 * 현재 사용 금액과 실적 구간을 바탕으로 실적 달성 현황 및 진행률(Progress)을 계산합니다.
 * @param currentSpend 이번 달 지출 금액 (원)
 * @param tiers 전월 실적 구간 배열 (오름차순)
 */
export function calculatePerformanceProgress(
  currentSpend: number,
  tiers: number[],
): PerformanceProgress {
  const sanitizedSpend = Math.max(0, Math.floor(currentSpend || 0));

  // 실적 조건이 없는 카드인 경우
  if (!tiers || tiers.length === 0) {
    return {
      currentSpend: sanitizedSpend,
      tiers: [],
      currentTierIndex: -1,
      status: "none",
      statusLabel: "실적 조건 없음",
      nextTierAmount: null,
      remainingToNextTier: 0,
      progressPercent: 100,
      targetProgressPercent: 100,
      targetTierAmount: 0,
    };
  }

  const sortedTiers = [...tiers].sort((a, b) => a - b);
  const minTier = sortedTiers[0];
  const maxTier = sortedTiers[sortedTiers.length - 1];

  // 달성한 최고 구간 인덱스 탐색
  let currentTierIndex = -1;
  for (let i = sortedTiers.length - 1; i >= 0; i--) {
    if (sanitizedSpend >= sortedTiers[i]) {
      currentTierIndex = i;
      break;
    }
  }

  // 1. 최소 실적 미달성인 경우
  if (currentTierIndex === -1) {
    const nextTierAmount = minTier;
    const remainingToNextTier = Math.max(0, nextTierAmount - sanitizedSpend);
    const progressPercent = Math.min(
      100,
      Math.max(0, Math.round((sanitizedSpend / maxTier) * 100)),
    );
    const targetProgressPercent = Math.min(
      100,
      Math.max(0, Math.round((sanitizedSpend / nextTierAmount) * 100)),
    );

    return {
      currentSpend: sanitizedSpend,
      tiers: sortedTiers,
      currentTierIndex: -1,
      status: "unmet",
      statusLabel: "미달성",
      nextTierAmount,
      remainingToNextTier,
      progressPercent,
      targetProgressPercent,
      targetTierAmount: nextTierAmount,
    };
  }

  // 2. 최고 혜택 구간 달성인 경우
  if (currentTierIndex === sortedTiers.length - 1) {
    return {
      currentSpend: sanitizedSpend,
      tiers: sortedTiers,
      currentTierIndex,
      status: "max",
      statusLabel: "최대 혜택",
      nextTierAmount: null,
      remainingToNextTier: 0,
      progressPercent: 100,
      targetProgressPercent: 100,
      targetTierAmount: maxTier,
    };
  }

  // 3. 중간 실적 구간 달성인 경우 (다음 상위 구간 존재)
  const nextTierAmount = sortedTiers[currentTierIndex + 1];
  const remainingToNextTier = Math.max(0, nextTierAmount - sanitizedSpend);
  const progressPercent = Math.min(
    100,
    Math.max(0, Math.round((sanitizedSpend / maxTier) * 100)),
  );
  const targetProgressPercent = Math.min(
    100,
    Math.max(0, Math.round((sanitizedSpend / nextTierAmount) * 100)),
  );

  return {
    currentSpend: sanitizedSpend,
    tiers: sortedTiers,
    currentTierIndex,
    status: "met",
    statusLabel: "달성",
    nextTierAmount,
    remainingToNextTier,
    progressPercent,
    targetProgressPercent,
    targetTierAmount: nextTierAmount,
  };
}
