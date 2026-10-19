import { describe, expect, it } from "vitest";
import {
  parsePerformanceTiers,
  getCardPerformanceTiers,
  calculatePerformanceProgress,
} from "@/lib/performanceTracker";
import type { CatalogEntry } from "@/types/catalog";

describe("performanceTracker", () => {
  describe("parsePerformanceTiers", () => {
    it("텍스트가 없을 때 신용카드는 기본 30/70/100만 구간을 반환한다", () => {
      const tiers = parsePerformanceTiers(undefined, "신용");
      expect(tiers).toEqual([300000, 700000, 1000000]);
    });

    it("텍스트가 없을 때 체크카드는 기본 20/50/80만 구간을 반환한다", () => {
      const tiers = parsePerformanceTiers(undefined, "체크");
      expect(tiers).toEqual([200000, 500000, 800000]);
    });

    it("'실적조건 없음' 또는 '무실적' 텍스트는 빈 배열을 반환한다", () => {
      expect(parsePerformanceTiers("실적조건 없음")).toEqual([]);
      expect(parsePerformanceTiers("전월 무실적")).toEqual([]);
      expect(parsePerformanceTiers("실적 무관")).toEqual([]);
      expect(parsePerformanceTiers("0원")).toEqual([]);
    });

    it("단일 실적 텍스트를 정확하게 원 단위 숫자로 파싱한다", () => {
      expect(parsePerformanceTiers("전월 실적 30만원 이상")).toEqual([300000]);
      expect(parsePerformanceTiers("전월 400,000원 이상")).toEqual([400000]);
    });

    it("여러 실적 구간이 나열된 텍스트를 오름차순 배열로 파싱한다", () => {
      const tiers = parsePerformanceTiers("전월 30만 / 70만 / 100만원 이상 이용 시");
      expect(tiers).toEqual([300000, 700000, 1000000]);

      const wonTiers = parsePerformanceTiers("300,000원, 600,000원, 1,200,000원");
      expect(wonTiers).toEqual([300000, 600000, 1200000]);
    });

    it("CatalogEntry 객체의 performanceStandard 또는 category로부터 실적을 추출한다", () => {
      const entry: CatalogEntry = {
        sourceId: 100,
        sourceUrl: "https://example.com",
        name: "테스트 카드",
        issuer: "테스트카드사",
        category: "신용",
        performanceStandard: "전월 50만원 이상",
        fetchedAt: new Date().toISOString(),
      };
      expect(getCardPerformanceTiers(entry)).toEqual([500000]);
    });
  });

  describe("calculatePerformanceProgress", () => {
    it("실적 조건이 없는 경우 status는 'none'이며 progressPercent는 100이다", () => {
      const result = calculatePerformanceProgress(100000, []);
      expect(result.status).toBe("none");
      expect(result.statusLabel).toBe("실적 조건 없음");
      expect(result.progressPercent).toBe(100);
      expect(result.remainingToNextTier).toBe(0);
      expect(result.nextTierAmount).toBeNull();
    });

    it("최소 실적 미달성 시 상태는 'unmet'이고 남은 금액과 달성률이 계산된다", () => {
      const tiers = [300000, 700000, 1000000];
      const result = calculatePerformanceProgress(150000, tiers);

      expect(result.status).toBe("unmet");
      expect(result.statusLabel).toBe("미달성");
      expect(result.currentTierIndex).toBe(-1);
      expect(result.nextTierAmount).toBe(300000);
      expect(result.remainingToNextTier).toBe(150000);
      // 전체 최고 실적(100만) 기준: 15%
      expect(result.progressPercent).toBe(15);
      // 최소 실적(30만) 기준: 50%
      expect(result.targetProgressPercent).toBe(50);
    });

    it("중간 실적 구간 달성 시 상태는 'met'이고 다음 구간까지 남은 금액이 계산된다", () => {
      const tiers = [300000, 700000, 1000000];
      const result = calculatePerformanceProgress(500000, tiers);

      expect(result.status).toBe("met");
      expect(result.statusLabel).toBe("달성");
      expect(result.currentTierIndex).toBe(0); // 30만원 달성
      expect(result.nextTierAmount).toBe(700000);
      expect(result.remainingToNextTier).toBe(200000);
      // 전체 최고 실적(100만) 기준: 50%
      expect(result.progressPercent).toBe(50);
      // 다음 목표(70만) 기준: 71%
      expect(result.targetProgressPercent).toBe(71);
    });

    it("최고 실적 구간 달성 시 상태는 'max'이고 다음 구간은 null이며 100%이다", () => {
      const tiers = [300000, 700000, 1000000];
      const result = calculatePerformanceProgress(1200000, tiers);

      expect(result.status).toBe("max");
      expect(result.statusLabel).toBe("최대 혜택");
      expect(result.currentTierIndex).toBe(2);
      expect(result.nextTierAmount).toBeNull();
      expect(result.remainingToNextTier).toBe(0);
      expect(result.progressPercent).toBe(100);
      expect(result.targetProgressPercent).toBe(100);
    });

    it("음수 금액이나 0원이 들어와도 에러 없이 0원으로 보정된다", () => {
      const tiers = [300000];
      const result = calculatePerformanceProgress(-5000, tiers);

      expect(result.currentSpend).toBe(0);
      expect(result.status).toBe("unmet");
      expect(result.remainingToNextTier).toBe(300000);
      expect(result.progressPercent).toBe(0);
    });
  });
});
