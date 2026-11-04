/** 지출 카테고리 ID. data/categories.json 과 1:1로 매칭됩니다. */
export type CategoryId = string;

export interface Category {
  id: CategoryId;
  label: string;
}

export type BenefitType = "discount" | "point" | "cashback";

export interface Benefit {
  /** 혜택이 적용되는 카테고리 ID */
  category: CategoryId;
  /** 할인 / 포인트적립 / 캐시백 구분 */
  type: BenefitType;
  /** 0.05 = 5% (상한 1.0 = 100%) */
  rate: number;
  /** 월 혜택 한도 (원). 없으면 무제한 */
  capPerMonth?: number;
  /** 정액 할인/적립인 경우 1회당 정액 혜택 금액 (원) */
  fixedPerUse?: number;
  /** 정액 할인/적립인 경우 월 예상 적용 횟수 */
  usesPerMonth?: number;
  /** 카탈로그 혜택 요약에서 구체적 혜택을 찾지 못해 부여된 기본(fallback) 혜택 여부 */
  isFallback?: boolean;
  description?: string;
}

export interface PerformanceTier {
  /** 이 구간의 혜택을 받기 위한 전월실적 최소 금액 (원) */
  minSpend: number;
  benefits: Benefit[];
}

export type CardType = "credit" | "check";

export interface Card {
  id: string;
  name: string;
  issuer: string;
  cardType: CardType;
  /** 연회비 (원) */
  annualFee: number;
  /** 전월실적 산정에서 제외되는 카테고리 */
  excludedCategories?: CategoryId[];
  /** 전월실적 구간별 혜택. minSpend 오름차순으로 저장 */
  tiers: PerformanceTier[];
  /** 카탈로그 혜택 요약에서 유효한 혜택을 찾지 못해 기본(0.7%) 혜택만 부여된 카드 여부 */
  hasFallbackBenefitOnly?: boolean;
  notes?: string;
}

/** 카테고리별 월 지출액 입력값 */
export type SpendingProfile = Record<CategoryId, number>;
