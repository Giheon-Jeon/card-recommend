import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  SPENDING_PRESETS,
  getPresetById,
  hasAnySpending,
  calculateTotalSpending,
  isProfileEqualToPreset,
  buildProfileFromPreset,
} from "@/lib/spendingPresets";
import {
  useSpendingProfile,
  readStoredSpending,
  SPENDING_STORAGE_KEY,
} from "@/lib/spendingProfile";
import type { Category, SpendingProfile } from "@/types/card";

const TEST_CATEGORIES: Category[] = [
  { id: "convenience", label: "편의점" },
  { id: "cafe", label: "카페/디저트" },
  { id: "transport", label: "대중교통" },
  { id: "mobile", label: "통신비" },
  { id: "onlineShopping", label: "온라인쇼핑" },
  { id: "mart", label: "대형마트/슈퍼" },
  { id: "dining", label: "외식" },
  { id: "culture", label: "영화/공연/OTT" },
  { id: "gas", label: "주유" },
  { id: "etc", label: "그 외 일반가맹점" },
];

describe("spendingPresets", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("대표 5종 프리셋이 정의되어 있고 모든 카테고리 값이 0 이상이어야 한다", () => {
    expect(SPENDING_PRESETS.length).toBe(5);

    const presetIds = SPENDING_PRESETS.map((p) => p.id);
    expect(presetIds).toEqual(["single", "commuter", "shopper", "family", "budget"]);

    SPENDING_PRESETS.forEach((preset) => {
      expect(preset.name).toBeTruthy();
      expect(preset.badge).toBeTruthy();
      expect(preset.summaryTags.length).toBeGreaterThan(0);
      TEST_CATEGORIES.forEach((cat) => {
        expect(preset.profile[cat.id]).toBeDefined();
        expect(preset.profile[cat.id]).toBeGreaterThanOrEqual(0);
      });
    });
  });

  it("getPresetById로 ID에 해당하는 프리셋을 정확히 반환해야 한다", () => {
    const single = getPresetById("single");
    expect(single).toBeDefined();
    expect(single?.name).toBe("1인 가구 자취생");

    const nonExistent = getPresetById("unknown");
    expect(nonExistent).toBeUndefined();
  });

  it("hasAnySpending은 지출이 0원이거나 없을 때 false, 하나라도 양수이면 true를 반환해야 한다", () => {
    expect(hasAnySpending({})).toBe(false);
    expect(hasAnySpending({ cafe: 0, transport: 0 })).toBe(false);
    expect(hasAnySpending({ cafe: 10000, transport: 0 })).toBe(true);
  });

  it("calculateTotalSpending은 카테고리별 지출 합계를 정확히 계산해야 한다", () => {
    const profile: SpendingProfile = {
      convenience: 50000,
      cafe: 30000,
      transport: 20000,
    };
    const total = calculateTotalSpending(profile, TEST_CATEGORIES);
    expect(total).toBe(100000);
  });

  it("isProfileEqualToPreset은 프로필 일치 여부를 정확히 판단해야 한다", () => {
    const single = getPresetById("single")!;
    const exactProfile = buildProfileFromPreset(single, TEST_CATEGORIES);
    expect(isProfileEqualToPreset(exactProfile, single, TEST_CATEGORIES)).toBe(true);

    const modifiedProfile = { ...exactProfile, cafe: 999999 };
    expect(isProfileEqualToPreset(modifiedProfile, single, TEST_CATEGORIES)).toBe(false);
  });

  it("useSpendingProfile의 applyPreset을 호출하면 상태와 localStorage가 즉시 갱신되어야 한다", () => {
    const { result } = renderHook(() => useSpendingProfile(TEST_CATEGORIES));
    const commuter = getPresetById("commuter")!;

    act(() => {
      result.current.applyPreset(commuter);
    });

    expect(result.current.spending.transport).toBe(120000);
    expect(result.current.spending.cafe).toBe(100000);
    expect(result.current.spending.dining).toBe(300000);

    const stored = readStoredSpending(TEST_CATEGORIES);
    expect(stored.transport).toBe(120000);
    expect(stored.cafe).toBe(100000);
    expect(localStorage.getItem(SPENDING_STORAGE_KEY)).toContain('"transport":120000');
  });
});
