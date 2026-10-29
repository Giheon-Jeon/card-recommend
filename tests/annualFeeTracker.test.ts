import { describe, it, expect } from "vitest";
import {
  calculateAnnualFeeDday,
  calculateExpiryDday,
  evaluateCardRenewalDecision,
} from "@/lib/annualFeeTracker";
import type { Card } from "@/types/card";

const mockCreditCard: Card = {
  id: "test-card-1",
  name: "테스트 프리미엄 카드",
  issuer: "신한카드",
  cardType: "credit",
  annualFee: 30000,
  excludedCategories: [],
  tiers: [
    {
      minSpend: 300000,
      benefits: [
        {
          category: "cafe",
          type: "discount",
          rate: 0.1,
          capPerMonth: 10000,
        },
      ],
    },
  ],
};

describe("annualFeeTracker - 연회비 청구 D-Day 계산", () => {
  it("차기 청구월 1일까지 남은 일수가 30일 이내이면 isUrgent가 true이고 경고 메시지를 반환해야 한다", () => {
    // 2026-10-29 기준 11월 청구(2026-11-01) -> D-3
    const info = calculateAnnualFeeDday(11, new Date(2026, 9, 29));
    expect(info).not.toBeNull();
    expect(info?.dDay).toBe(3);
    expect(info?.isUrgent).toBe(true);
    expect(info?.nextBillingDate).toBe("2026-11-01");
    expect(info?.dDayLabel).toBe("연회비 청구 D-3 (11월)");
    expect(info?.alertMessage).toContain("3일 남았습니다");
  });

  it("정확히 D-30 경계에서는 isUrgent가 true이고 D-31에서는 false여야 한다", () => {
    // 2026-10-02 -> 2026-11-01은 30일 차이
    const d30 = calculateAnnualFeeDday(11, new Date(2026, 9, 2));
    expect(d30?.dDay).toBe(30);
    expect(d30?.isUrgent).toBe(true);

    // 2026-10-01 -> 2026-11-01은 31일 차이
    const d31 = calculateAnnualFeeDday(11, new Date(2026, 9, 1));
    expect(d31?.dDay).toBe(31);
    expect(d31?.isUrgent).toBe(false);
    expect(d31?.alertMessage).toBeNull();
  });

  it("청구월 1일 당일이면 D-Day(0일)로 판정되어야 한다", () => {
    const d0 = calculateAnnualFeeDday(11, new Date(2026, 10, 1));
    expect(d0?.dDay).toBe(0);
    expect(d0?.isUrgent).toBe(true);
    expect(d0?.dDayLabel).toBe("연회비 청구 D-Day (11월)");
  });

  it("이미 올해 청구월 1일이 지난 경우 내년 청구월 1일을 기준으로 계산해야 한다", () => {
    // 2026-12-15 기준 1월 청구(2027-01-01) -> D-17
    const nextYear = calculateAnnualFeeDday(1, new Date(2026, 11, 15));
    expect(nextYear?.nextBillingDate).toBe("2027-01-01");
    expect(nextYear?.dDay).toBe(17);
    expect(nextYear?.isUrgent).toBe(true);
  });
});

describe("annualFeeTracker - 유효기간 만료 D-Day 계산", () => {
  it("유효기간이 충분히 남은 경우 정상 라벨을 반환해야 한다", () => {
    const info = calculateExpiryDday("05/29", new Date(2026, 9, 29));
    expect(info).not.toBeNull();
    expect(info?.expiryDate).toBe("05/29");
    expect(info?.expiryYear).toBe(2029);
    expect(info?.expiryMonth).toBe(5);
    expect(info?.isExpired).toBe(false);
    expect(info?.isExpiringSoon).toBe(false);
    expect(info?.dDayLabel).toBe("유효기간 05/29");
  });

  it("유효기간 만료가 60일 이내이면 isExpiringSoon이 true여야 한다", () => {
    // 2026-10-29 기준 11/26(2026-11-30 말일) -> D-32
    const info = calculateExpiryDday("11/26", new Date(2026, 9, 29));
    expect(info?.dDay).toBe(32);
    expect(info?.isExpiringSoon).toBe(true);
    expect(info?.dDayLabel).toBe("만료 임박 D-32 (11/26)");
  });

  it("유효기간이 지난 경우 isExpired가 true여야 한다", () => {
    const info = calculateExpiryDday("09/26", new Date(2026, 9, 29));
    expect(info?.isExpired).toBe(true);
    expect(info?.dDayLabel).toBe("유효기간 만료 (09/26)");
  });
});

describe("annualFeeTracker - 갱신/해지 의사결정 보조 위젯 분석", () => {
  it("연간 예상 혜택이 연회비보다 높으면 '유지 권장'(keep)으로 판정해야 한다", () => {
    // 월 50만원 사용 -> 월 10,000원 혜택 -> 연 120,000원 혜택 vs 연회비 30,000원 -> 순혜택 +90,000원
    const result = evaluateCardRenewalDecision({
      entry: mockCreditCard,
      monthlySpend: 500000,
      meta: { issuedMonth: "2024-11", annualFeeMonth: 11, expiryDate: "11/29" },
      currentDate: new Date(2026, 9, 29),
    });

    expect(result.decision).toBe("keep");
    expect(result.decisionLabel).toBe("유지 권장");
    expect(result.annualBenefit).toBe(120000);
    expect(result.annualFee).toBe(30000);
    expect(result.annualNetBenefit).toBe(90000);
    expect(result.roiRatio).toBe(4);
    expect(result.annualFeeDday?.isUrgent).toBe(true);
  });

  it("실적 미달 등으로 연간 예상 혜택이 연회비 이하이면 '해지/교체 검토'(review)로 판정해야 한다", () => {
    // 월 10만원 사용 (최소 실적 30만원 미달) -> 월 0원 혜택 -> 순혜택 -30,000원
    const result = evaluateCardRenewalDecision({
      entry: mockCreditCard,
      monthlySpend: 100000,
      currentDate: new Date(2026, 9, 29),
    });

    expect(result.decision).toBe("review");
    expect(result.decisionLabel).toBe("해지/교체 검토");
    expect(result.annualBenefit).toBe(0);
    expect(result.annualNetBenefit).toBe(-30000);
    expect(result.meetsMinimumSpend).toBe(false);
    expect(result.reasonText).toContain("해지 또는 교체를 검토");
  });

  it("실적은 충족했으나 월 혜택이 작아 연간 누적 혜택이 연회비보다 적으면 '해지/교체 검토'로 판정해야 한다", () => {
    const result = evaluateCardRenewalDecision({
      entry: mockCreditCard,
      monthlySpend: 300000,
      monthlyBenefitOverride: 1500, // 연 18,000원 혜택 < 연회비 30,000원
    });

    expect(result.decision).toBe("review");
    expect(result.annualBenefit).toBe(18000);
    expect(result.annualNetBenefit).toBe(-12000);
  });
});

