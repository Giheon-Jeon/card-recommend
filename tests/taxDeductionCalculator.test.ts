import { describe, expect, it } from "vitest";
import {
  calculateCardTaxSavings,
  calculatePickingRate,
  evaluateCardWithTaxSavings,
  getMarginalTaxRate,
  getTaxDeductionLimit,
} from "@/lib/taxDeductionCalculator";
import type { Card } from "@/types/card";

describe("taxDeductionCalculator", () => {
  describe("getTaxDeductionLimit", () => {
    it("총급여 7천만원 이하는 300만원 한도를 반환한다", () => {
      expect(getTaxDeductionLimit(50000000)).toBe(3000000);
      expect(getTaxDeductionLimit(70000000)).toBe(3000000);
    });

    it("총급여 7천만원 초과 1.2억원 이하는 250만원 한도를 반환한다", () => {
      expect(getTaxDeductionLimit(80000000)).toBe(2500000);
      expect(getTaxDeductionLimit(120000000)).toBe(2500000);
    });

    it("총급여 1.2억원 초과는 200만원 한도를 반환한다", () => {
      expect(getTaxDeductionLimit(150000000)).toBe(2000000);
    });
  });

  describe("getMarginalTaxRate", () => {
    it("총급여 구간별 한계세율을 올바르게 반환한다", () => {
      expect(getMarginalTaxRate(12000000)).toBe(0.066);
      expect(getMarginalTaxRate(45000000)).toBe(0.165);
      expect(getMarginalTaxRate(70000000)).toBe(0.264);
      expect(getMarginalTaxRate(100000000)).toBe(0.385);
      expect(getMarginalTaxRate(200000000)).toBe(0.418);
    });
  });

  describe("calculateCardTaxSavings", () => {
    it("총급여의 25% 미만 지출 시 공제금액과 절세액은 0원이다", () => {
      // 연봉 5,000만원의 25% = 1,250만원
      const result = calculateCardTaxSavings({
        annualSalary: 50000000,
        annualSpend: 10000000, // 1,000만원 (< 1,250만원)
        cardType: "credit",
      });

      expect(result.threshold).toBe(12500000);
      expect(result.excessSpend).toBe(0);
      expect(result.deductionAmount).toBe(0);
      expect(result.annualTaxSavings).toBe(0);
      expect(result.monthlyTaxSavings).toBe(0);
    });

    it("문턱 초과 지출 시 체크카드가 신용카드보다 2배 높은 공제율(30% vs 15%)을 적용받는다", () => {
      // 연봉 5,000만원, 연간 2,250만원 지출 (문턱 초과분 1,000만원)
      const creditResult = calculateCardTaxSavings({
        annualSalary: 50000000,
        annualSpend: 22500000,
        cardType: "credit",
      });

      const checkResult = calculateCardTaxSavings({
        annualSalary: 50000000,
        annualSpend: 22500000,
        cardType: "check",
      });

      expect(creditResult.excessSpend).toBe(10000000);
      expect(creditResult.deductionRate).toBe(0.15);
      expect(creditResult.deductionAmount).toBe(1500000); // 1,000만 * 15%

      expect(checkResult.excessSpend).toBe(10000000);
      expect(checkResult.deductionRate).toBe(0.3);
      expect(checkResult.deductionAmount).toBe(3000000); // 1,000만 * 30%

      // 체크카드의 절세액이 신용카드의 2배
      expect(checkResult.annualTaxSavings).toBe(creditResult.annualTaxSavings * 2);
    });

    it("공제 한도를 초과하는 금액은 한도까지만 인정된다", () => {
      // 체크카드 30% 공제로 1,500만원 초과 지출 시 450만원 공제 대상이나 한도 300만원 적용
      const result = calculateCardTaxSavings({
        annualSalary: 50000000,
        annualSpend: 12500000 + 15000000, // 문턱 1250만 + 초과 1500만
        cardType: "check",
      });

      expect(result.deductionLimit).toBe(3000000);
      expect(result.deductionAmount).toBe(3000000);
      expect(result.annualTaxSavings).toBe(Math.round(3000000 * 0.165));
    });
  });

  describe("calculatePickingRate", () => {
    it("지출액이 0원이면 피킹률 0%와 낮음 등급을 반환한다", () => {
      const res = calculatePickingRate(0, 0);
      expect(res.pickingRate).toBe(0);
      expect(res.tierLabel).toBe("낮음");
    });

    it("혜택 금액 대비 피킹률과 등급을 올바르게 분류한다", () => {
      // 100만원 지출, 5.5만원 혜택 = 5.5% (최고 혜택)
      const top = calculatePickingRate(1000000, 55000);
      expect(top.pickingRate).toBe(5.5);
      expect(top.tierLabel).toBe("최고 혜택");

      // 100만원 지출, 3.5만원 혜택 = 3.5% (우수)
      const good = calculatePickingRate(1000000, 35000);
      expect(good.pickingRate).toBe(3.5);
      expect(good.tierLabel).toBe("우수");

      // 100만원 지출, 2만원 혜택 = 2.0% (무난)
      const fair = calculatePickingRate(1000000, 20000);
      expect(fair.pickingRate).toBe(2.0);
      expect(fair.tierLabel).toBe("무난");

      // 100만원 지출, 1만원 혜택 = 1.0% (낮음)
      const low = calculatePickingRate(1000000, 10000);
      expect(low.pickingRate).toBe(1.0);
      expect(low.tierLabel).toBe("낮음");
    });

    it("소득공제 절세액이 주어지면 조정 피킹률을 산출한다", () => {
      // 100만원 지출, 순수 혜택 3만원(3%) + 절세액 1만원(1%) = 조정 피킹률 4%
      const res = calculatePickingRate(1000000, 30000, 10000);
      expect(res.pickingRate).toBe(3.0);
      expect(res.adjustedPickingRate).toBe(4.0);
    });
  });

  describe("evaluateCardWithTaxSavings", () => {
    const mockCard: Card = {
      id: "card-check-1",
      name: "KB국민 노리2 체크카드",
      cardType: "check",
      annualFee: 0,
      tiers: [],
    };

    it("월 지출액과 카드 정보를 바탕으로 종합 절세 지표와 순혜택을 반환한다", () => {
      const result = evaluateCardWithTaxSavings(mockCard, 1500000, 25000, 50000000);
      expect(result.taxResult.cardType).toBe("check");
      expect(result.pickingRate.pickingRate).toBeGreaterThan(0);
      expect(result.combinedMonthlyNetBenefit).toBeGreaterThan(25000);
    });
  });
});
