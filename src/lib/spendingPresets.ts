import type { Category, SpendingProfile } from "@/types/card";

export interface SpendingPreset {
  id: string;
  name: string;
  badge: string;
  description: string;
  iconName: "Home" | "Briefcase" | "ShoppingBag" | "Users" | "Coins";
  summaryTags: string[];
  profile: SpendingProfile;
}

/**
 * 10개 소비 카테고리 기준 대표 라이프스타일 소비 지출 프리셋 데이터셋
 */
export const SPENDING_PRESETS: SpendingPreset[] = [
  {
    id: "single",
    name: "1인 가구 자취생",
    badge: "월 80만",
    description: "배달음식, 간편식, 편의점 및 온라인 쇼핑 비중이 높은 자취 라이프",
    iconName: "Home",
    summaryTags: ["배달/외식", "온라인쇼핑", "편의점"],
    profile: {
      convenience: 100000,
      cafe: 50000,
      transport: 70000,
      mobile: 60000,
      onlineShopping: 200000,
      mart: 50000,
      dining: 150000,
      culture: 30000,
      gas: 0,
      etc: 90000,
    },
  },
  {
    id: "commuter",
    name: "직장인 통근러",
    badge: "월 120만",
    description: "대중교통/광역버스 통근과 점심 식대, 카페 커피 지출이 핵심인 직장인",
    iconName: "Briefcase",
    summaryTags: ["대중교통", "점심/외식", "카페"],
    profile: {
      convenience: 50000,
      cafe: 100000,
      transport: 120000,
      mobile: 70000,
      onlineShopping: 150000,
      mart: 80000,
      dining: 300000,
      culture: 50000,
      gas: 150000,
      etc: 130000,
    },
  },
  {
    id: "shopper",
    name: "카페·쇼핑 매니아",
    badge: "월 150만",
    description: "온라인 패션/라이프스타일 쇼핑과 트렌디한 카페 투어를 즐기는 소비 패턴",
    iconName: "ShoppingBag",
    summaryTags: ["온라인쇼핑", "카페투어", "외식/미식"],
    profile: {
      convenience: 50000,
      cafe: 200000,
      transport: 80000,
      mobile: 70000,
      onlineShopping: 450000,
      mart: 50000,
      dining: 350000,
      culture: 100000,
      gas: 0,
      etc: 150000,
    },
  },
  {
    id: "family",
    name: "마트 중심 4인 가구",
    badge: "월 250만",
    description: "대형마트 장보기, 자차 주유, 가족 외식 및 생활비 중심의 다인가구",
    iconName: "Users",
    summaryTags: ["대형마트", "주유", "가족외식"],
    profile: {
      convenience: 70000,
      cafe: 80000,
      transport: 70000,
      mobile: 150000,
      onlineShopping: 350000,
      mart: 600000,
      dining: 400000,
      culture: 80000,
      gas: 300000,
      etc: 400000,
    },
  },
  {
    id: "budget",
    name: "알뜰 사회초년생",
    badge: "월 50만",
    description: "고정지출과 변동소비를 최소화하여 저축과 카드 실적 효율을 극대화",
    iconName: "Coins",
    summaryTags: ["고정비절약", "실속소비", "대중교통"],
    profile: {
      convenience: 40000,
      cafe: 30000,
      transport: 60000,
      mobile: 40000,
      onlineShopping: 70000,
      mart: 80000,
      dining: 120000,
      culture: 20000,
      gas: 0,
      etc: 40000,
    },
  },
];

/**
 * 프리셋 ID로 프리셋 객체를 조회합니다.
 */
export function getPresetById(id: string): SpendingPreset | undefined {
  return SPENDING_PRESETS.find((preset) => preset.id === id);
}

/**
 * 주어진 지출 프로필에 0원이 아닌 지출 항목이 존재하는지 확인합니다.
 */
export function hasAnySpending(spending: SpendingProfile): boolean {
  return Object.values(spending).some((amount) => typeof amount === "number" && amount > 0);
}

/**
 * 주어진 지출 프로필의 총액을 계산합니다.
 */
export function calculateTotalSpending(
  spending: SpendingProfile,
  categories: Category[],
): number {
  return categories.reduce((sum, c) => sum + (spending[c.id] ?? 0), 0);
}

/**
 * 현재 소비 프로필이 특정 프리셋의 수치와 완전히 동일한지 비교합니다.
 */
export function isProfileEqualToPreset(
  spending: SpendingProfile,
  preset: SpendingPreset,
  categories: Category[],
): boolean {
  for (const category of categories) {
    const currentVal = spending[category.id] ?? 0;
    const presetVal = preset.profile[category.id] ?? 0;
    if (currentVal !== presetVal) {
      return false;
    }
  }
  return true;
}

/**
 * 특정 카테고리 목록 기준으로 온전한 소비 프로필 객체를 생성합니다.
 */
export function buildProfileFromPreset(
  preset: SpendingPreset,
  categories: Category[],
): SpendingProfile {
  const profile: SpendingProfile = {};
  for (const category of categories) {
    profile[category.id] = preset.profile[category.id] ?? 0;
  }
  return profile;
}
