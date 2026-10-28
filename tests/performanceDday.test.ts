import { describe, expect, it } from "vitest";
import {
  calculateRemainingDaysInMonth,
  calculateDailyRecommendedSpend,
  getRecommendedSpendingTip,
  getPerformanceDdayInfo,
} from "@/lib/performanceDday";
import type { CatalogEntry } from "@/types/catalog";
import type { Card } from "@/types/card";

describe("performanceDday 유틸리티", () => {
  describe("calculateRemainingDaysInMonth (말일 D-Day 계산)", () => {
    it("월 중간 일자(10월 15일)에서 D-Day와 오늘 포함 잔여 일수를 올바르게 계산한다", () => {
      const result = calculateRemainingDaysInMonth("2026-10-15");
      // 10월은 31일까지 있으므로 31 - 15 = 16일 남음
      expect(result.dDay).toBe(16);
      expect(result.daysRemaining).toBe(17);
      expect(result.dDayLabel).toBe("말일 D-16");
      expect(result.isMonthEndUrgent).toBe(false);
    });

    it("말일 임박 일자(10월 28일)에서 D-Day 3일 및 긴급(isMonthEndUrgent) 플래그가 활성화된다", () => {
      const result = calculateRemainingDaysInMonth("2026-10-28");
      // 31 - 28 = 3일
      expect(result.dDay).toBe(3);
      expect(result.daysRemaining).toBe(4);
      expect(result.dDayLabel).toBe("말일 D-3");
      expect(result.isMonthEndUrgent).toBe(true);
    });

    it("말일 당일(10월 31일)인 경우 D-Day 0과 오늘 마감 라벨을 반환한다", () => {
      const result = calculateRemainingDaysInMonth("2026-10-31");
      expect(result.dDay).toBe(0);
      expect(result.daysRemaining).toBe(1);
      expect(result.dDayLabel).toBe("말일 D-Day (오늘 마감)");
      expect(result.isMonthEndUrgent).toBe(true);
    });

    it("윤년 2월(2024년 2월 10일)의 29일 말일을 올바르게 반영한다", () => {
      const result = calculateRemainingDaysInMonth("2024-02-10");
      // 29 - 10 = 19일
      expect(result.dDay).toBe(19);
      expect(result.daysRemaining).toBe(20);
    });

    it("평년 2월(2025년 2월 10일)의 28일 말일을 올바르게 반영한다", () => {
      const result = calculateRemainingDaysInMonth("2025-02-10");
      // 28 - 10 = 18일
      expect(result.dDay).toBe(18);
      expect(result.daysRemaining).toBe(19);
    });
  });

  describe("calculateDailyRecommendedSpend (일평균 권장 소비액)", () => {
    it("부족 실적 75,000원과 잔여 4일이 주어지면 일평균 18,750원을 반환한다", () => {
      const daily = calculateDailyRecommendedSpend(75000, 4);
      expect(daily).toBe(18750);
    });

    it("나누어떨어지지 않을 경우 Math.ceil로 원 단위 올림 처리한다", () => {
      // 100,000 / 3 = 33333.333... -> 33,334
      const daily = calculateDailyRecommendedSpend(100000, 3);
      expect(daily).toBe(33334);
    });

    it("부족 실적이 0원 이하인 경우 0원을 반환한다", () => {
      expect(calculateDailyRecommendedSpend(0, 5)).toBe(0);
      expect(calculateDailyRecommendedSpend(-5000, 5)).toBe(0);
    });

    it("잔여 일수가 0일 이하로 전달되더라도 최소 1일로 안전하게 보정된다", () => {
      expect(calculateDailyRecommendedSpend(50000, 0)).toBe(50000);
      expect(calculateDailyRecommendedSpend(50000, -2)).toBe(50000);
    });
  });

  describe("getRecommendedSpendingTip (실적 채우기 소비 추천 팁)", () => {
    const mockCatalogEntry: CatalogEntry = {
      sourceId: 101,
      sourceUrl: "https://example.com/card/101",
      name: "신한카드 카페앤쇼핑",
      issuer: "신한카드",
      category: "신용",
      benefitSummary:
        "스타벅스/투썸 10% 할인, 쿠팡/네이버쇼핑 5% 적립, 편의점 3% 할인",
      performanceStandard: "전월 30만원 이상",
      fetchedAt: "2026-10-01",
    };

    it("카탈로그 엔트리에서 가장 할인/적립률이 높은 카테고리(카페 10%)를 팁으로 추출한다", () => {
      const tip = getRecommendedSpendingTip(mockCatalogEntry, 75000);
      expect(tip).not.toBeNull();
      expect(tip?.category).toBe("cafe");
      expect(tip?.categoryLabel).toBe("카페/디저트");
      expect(tip?.ratePercent).toBe(10);
      expect(tip?.benefitType).toBe("discount");
      expect(tip?.benefitTypeLabel).toBe("할인");
      expect(tip?.estimatedBenefit).toBe(7500); // 75,000원의 10%
      expect(tip?.tipMessage).toContain("카페/디저트");
      expect(tip?.tipMessage).toContain("10% 할인");
    });

    it("Card 객체에서 최고 혜택 카테고리를 올바르게 추출한다", () => {
      const mockCard: Card = {
        id: "custom-card-1",
        name: "모빌리티 카드",
        issuer: "KB국민카드",
        cardType: "credit",
        annualFee: 15000,
        tiers: [
          {
            minSpend: 300000,
            benefits: [
              {
                category: "gas",
                type: "point",
                rate: 0.08,
                capPerMonth: 20000,
                description: "주유소 8% 포인트 적립",
              },
              {
                category: "cafe",
                type: "discount",
                rate: 0.05,
                capPerMonth: 5000,
                description: "카페 5% 할인",
              },
            ],
          },
        ],
      };

      const tip = getRecommendedSpendingTip(mockCard, 100000);
      expect(tip).not.toBeNull();
      expect(tip?.category).toBe("gas");
      expect(tip?.categoryLabel).toBe("주유");
      expect(tip?.ratePercent).toBe(8);
      expect(tip?.benefitType).toBe("point");
      expect(tip?.benefitTypeLabel).toBe("적립");
      expect(tip?.estimatedBenefit).toBe(8000); // 100,000원의 8%
    });

    it("월 한도(capPerMonth)가 있는 경우 예상 혜택이 한도를 초과하지 않도록 제한한다", () => {
      const mockCardWithCap: Card = {
        id: "cap-card",
        name: "한도 제한 카드",
        issuer: "삼성카드",
        cardType: "credit",
        annualFee: 10000,
        tiers: [
          {
            minSpend: 300000,
            benefits: [
              {
                category: "dining",
                type: "discount",
                rate: 0.2, // 20%
                capPerMonth: 10000, // 최대 10,000원 한도
              },
            ],
          },
        ],
      };

      // 100,000원의 20%는 20,000원이지만 한도는 10,000원
      const tip = getRecommendedSpendingTip(mockCardWithCap, 100000);
      expect(tip?.estimatedBenefit).toBe(10000);
    });

    it("카드 정보가 없거나 혜택이 없으면 null을 반환한다", () => {
      expect(getRecommendedSpendingTip(undefined, 50000)).toBeNull();
    });
  });

  describe("getPerformanceDdayInfo (종합 가이드 정보)", () => {
    const mockEntry: CatalogEntry = {
      sourceId: 202,
      sourceUrl: "https://example.com/card/202",
      name: "테스트 쇼핑카드",
      issuer: "현대카드",
      category: "신용",
      benefitSummary: "쿠팡/네이버쇼핑 7% 적립",
      fetchedAt: "2026-10-01",
    };

    it("부족 실적과 기준 일자가 주어졌을 때 D-Day, 일평균 권장액, 팁을 포함한 종합 객체를 반환한다", () => {
      const info = getPerformanceDdayInfo(140000, mockEntry, "2026-10-25");

      // 10월 31일 - 25일 = 6일 D-Day, 잔여 7일
      expect(info.dDay).toBe(6);
      expect(info.daysRemaining).toBe(7);
      expect(info.dDayLabel).toBe("말일 D-6");
      expect(info.dailyRecommendedSpend).toBe(20000); // 140,000 / 7일 = 20,000원
      expect(info.recommendedTip?.category).toBe("onlineShopping");
      expect(info.recommendedTip?.ratePercent).toBe(7);
      expect(info.recommendedTip?.estimatedBenefit).toBe(9800); // 140,000 * 7% = 9,800원
    });
  });
});
