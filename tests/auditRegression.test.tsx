import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  evaluateCard,
  clearBenefitCache,
  getBenefitCacheStats,
} from "@/lib/benefitCalculator";
import {
  calculateRemainingDaysInMonth,
  calculateDailyRecommendedSpend,
  getPerformanceDdayInfo,
} from "@/lib/performanceDday";
import { calculatePerformanceProgress } from "@/lib/performanceTracker";
import { parseAmountValue } from "@/lib/csvSpendingParser";
import { copyTextToClipboard } from "@/lib/recommendationShare";
import { parseAndValidateMyCardsBackup } from "@/lib/myCards";
import { GeminiApiKeyProvider } from "@/contexts/GeminiApiKeyContext";
import { useGeminiApiKey } from "@/hooks/useGeminiApiKey";
import type { Card } from "@/types/card";

/**
 * [CA/QA 감사] 현재 올바르게 동작하는 경계값을 회귀 테스트로 고정합니다.
 * 결함 재현 코드는 docs/audit/qa-report.md 에 별도로 기록합니다.
 */

const tieredCard: Card = {
  id: "audit-tiered",
  name: "감사용 구간 카드",
  issuer: "감사",
  cardType: "credit",
  annualFee: 12000,
  excludedCategories: ["mobile"],
  tiers: [
    { minSpend: 300000, benefits: [{ category: "cafe", type: "discount", rate: 0.1, capPerMonth: 10000 }] },
    { minSpend: 700000, benefits: [{ category: "cafe", type: "discount", rate: 0.2, capPerMonth: 20000 }] },
  ],
};

describe("[감사] benefitCalculator 경계값", () => {
  beforeEach(() => clearBenefitCache());

  it("실적 구간 경계(정확히 minSpend)에서 해당 구간이 적용된다", () => {
    const atLower = evaluateCard(tieredCard, { cafe: 300000 }, false);
    expect(atLower.tierIndex).toBe(0);
    expect(atLower.totalMonthlyBenefit).toBe(10000);

    const belowLower = evaluateCard(tieredCard, { cafe: 299999 }, false);
    expect(belowLower.meetsMinimum).toBe(false);
    expect(belowLower.totalMonthlyBenefit).toBe(0);
    expect(belowLower.netMonthlyBenefit).toBe(-1000);
  });

  it("전월실적 제외 카테고리는 실적 인정 금액에서 빠진다", () => {
    const result = evaluateCard(tieredCard, { cafe: 200000, mobile: 200000 }, false);
    expect(result.qualifyingSpend).toBe(200000);
    expect(result.meetsMinimum).toBe(false);
  });

  it("캐시 최대 크기에 도달하면 가장 오래된 항목을 제거하고 크기를 유지한다", () => {
    const { maxSize } = getBenefitCacheStats();
    for (let i = 1; i <= maxSize + 1; i++) {
      evaluateCard(tieredCard, { cafe: i });
    }
    expect(getBenefitCacheStats().size).toBe(maxSize);

    // 첫 항목(cafe: 1)은 제거되어 다시 계산(miss)되어야 한다
    const missesBefore = getBenefitCacheStats().misses;
    evaluateCard(tieredCard, { cafe: 1 });
    expect(getBenefitCacheStats().misses).toBe(missesBefore + 1);
  });

  it("캐시 사용 여부와 무관하게 음수가 없는 지출에서는 동일한 결과를 반환한다", () => {
    const spending = { cafe: 450000, etc: 300000 };
    const cached = evaluateCard(tieredCard, spending);
    const fresh = evaluateCard(tieredCard, spending, false);
    expect(cached.netMonthlyBenefit).toBe(fresh.netMonthlyBenefit);
    expect(cached.tierIndex).toBe(1);
  });
});

describe("[감사] performanceDday 날짜 경계", () => {
  it("윤년 2월 말일은 D-Day, 잔여 1일로 계산된다", () => {
    const info = calculateRemainingDaysInMonth(new Date(2028, 1, 29));
    expect(info.dDay).toBe(0);
    expect(info.daysRemaining).toBe(1);
    expect(info.dDayLabel).toBe("말일 D-Day (오늘 마감)");
  });

  it("평년 2월 1일은 D-27, 잔여 28일로 계산된다", () => {
    const info = calculateRemainingDaysInMonth(new Date(2027, 1, 1));
    expect(info.dDay).toBe(27);
    expect(info.daysRemaining).toBe(28);
    expect(info.isMonthEndUrgent).toBe(false);
  });

  it("12월 26일은 D-5로 임박 상태가 된다", () => {
    const info = calculateRemainingDaysInMonth(new Date(2026, 11, 26));
    expect(info.dDay).toBe(5);
    expect(info.isMonthEndUrgent).toBe(true);
  });

  it("잔여 일수가 0 이하로 들어와도 1일로 보정해 일평균 금액을 계산한다", () => {
    expect(calculateDailyRecommendedSpend(10001, 0)).toBe(10001);
    expect(calculateDailyRecommendedSpend(10001, 2)).toBe(5001);
    expect(calculateDailyRecommendedSpend(-5000, 3)).toBe(0);
  });

  it("카드 정보 없이도 D-Day 정보를 산출하고 추천 팁은 null이다", () => {
    const info = getPerformanceDdayInfo(90000, undefined, new Date(2026, 9, 29));
    expect(info.dDay).toBe(2);
    expect(info.daysRemaining).toBe(3);
    expect(info.dailyRecommendedSpend).toBe(30000);
    expect(info.recommendedTip).toBeNull();
  });
});

describe("[감사] performanceTracker 입력 정규화", () => {
  it("정렬되지 않은 구간 배열과 소수 지출도 정렬·내림 처리한다", () => {
    const progress = calculatePerformanceProgress(500000.9, [700000, 300000]);
    expect(progress.tiers).toEqual([300000, 700000]);
    expect(progress.currentSpend).toBe(500000);
    expect(progress.status).toBe("met");
    expect(progress.remainingToNextTier).toBe(200000);
  });

  it("음수/NaN 지출은 0원으로 취급한다", () => {
    expect(calculatePerformanceProgress(-1000, [300000]).currentSpend).toBe(0);
    expect(calculatePerformanceProgress(Number.NaN, [300000]).currentSpend).toBe(0);
  });
});

describe("[감사] CSV 금액 파싱 부호 규칙", () => {
  it("괄호 표기와 ▲ 표기를 환불(음수)로 해석한다", () => {
    expect(parseAmountValue("(12,000)")).toBe(-12000);
    expect(parseAmountValue("▲5,500")).toBe(-5500);
  });

  it("상태 컬럼의 부분취소 키워드로 음수 처리한다", () => {
    expect(parseAmountValue("8,000원", "부분취소")).toBe(-8000);
    expect(parseAmountValue("8,000원", "정상")).toBe(8000);
  });

  it("숫자가 없는 값은 0을 반환한다", () => {
    expect(parseAmountValue("-")).toBe(0);
    expect(parseAmountValue("")).toBe(0);
  });
});

describe("[감사] 내 카드 백업 검증", () => {
  it("소수/0/음수/문자열 ID가 섞이면 전체를 거부한다", () => {
    for (const bad of [[1, 2.5], [0], [-3], ["7"]]) {
      const result = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: bad }));
      expect(result.success).toBe(false);
    }
  });

  it("중복 ID는 하나로 합친다", () => {
    const result = parseAndValidateMyCardsBackup(JSON.stringify([3, 3, 5]));
    expect(result).toEqual({ success: true, cardIds: [3, 5], count: 2 });
  });
});

describe("[감사] 클립보드 복사 fallback", () => {
  it("clipboard API가 없고 execCommand가 예외를 던지면 false를 반환한다", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true, writable: true });
    const original = document.execCommand;
    document.execCommand = vi.fn(() => {
      throw new Error("not allowed");
    });
    try {
      await expect(copyTextToClipboard("x")).resolves.toBe(false);
    } finally {
      document.execCommand = original;
    }
  });
});

describe("[감사] GeminiApiKeyContext 탭 간 동기화", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <GeminiApiKeyProvider>{children}</GeminiApiKeyProvider>
  );

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("세션 키가 없으면 다른 탭의 localStorage 변경을 반영한다", () => {
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "gemini_api_key", newValue: " other-tab-key " }));
    });
    expect(result.current.apiKey).toBe("other-tab-key");
    expect(result.current.storageType).toBe("local");
  });

  it("세션 키가 있으면 다른 탭의 변경을 무시한다", () => {
    sessionStorage.setItem("gemini_api_key", "session-key");
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "gemini_api_key", newValue: "other" }));
    });
    expect(result.current.apiKey).toBe("session-key");
    expect(result.current.storageType).toBe("session");
  });

  it("다른 키의 storage 이벤트는 무시한다", () => {
    localStorage.setItem("gemini_api_key", "local-key");
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });
    act(() => {
      window.dispatchEvent(new StorageEvent("storage", { key: "theme-mode", newValue: "dark" }));
    });
    expect(result.current.apiKey).toBe("local-key");
  });
});
