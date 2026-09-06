import { describe, it, expect } from "vitest";
import { parseTextLocally } from "@/lib/importerParser";

describe("parseTextLocally", () => {
  it("카드 승인 문자 포맷에서 편의점 결제 건을 올바르게 파싱한다", () => {
    const text = "[신한체크승인] 전기헌 08/23 14:15 GS25강남역점 4,500원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "GS25강남역점",
      amount: 4500,
      category: "convenience",
    });
  });

  it("현대카드 승인 포맷에서 카페 결제 건을 올바르게 파싱한다", () => {
    const text = "[현대카드] 전기헌 08/22 19:30 스타벅스 12,000원 일시불";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "스타벅스",
      amount: 12000,
      category: "cafe",
    });
  });

  it("대중교통 티머니 내역을 올바르게 파싱한다", () => {
    const text = "티머니 대중교통 55,000원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "대중교통",
      amount: 55000,
      category: "transport",
    });
  });

  it("쿠팡 온라인 쇼핑 내역을 올바르게 파싱한다", () => {
    const text = "쿠팡 결제 42,900원";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      merchant: "쿠팡",
      amount: 42900,
      category: "onlineShopping",
    });
  });

  it("여러 행의 지출 텍스트를 동시에 처리할 수 있다", () => {
    const text = `
      [신한체크승인] GS25강남역점 4,500원
      [현대카드] 스타벅스 12,000원
      쿠팡 결제 42,900원
    `;
    const result = parseTextLocally(text);
    expect(result).toHaveLength(3);
    expect(result[0].category).toBe("convenience");
    expect(result[1].category).toBe("cafe");
    expect(result[2].category).toBe("onlineShopping");
  });

  it("금액이 매칭되지 않는 행은 건너뛴다", () => {
    const text = "이것은 지출이 아닌 일반 텍스트입니다.";
    const result = parseTextLocally(text);
    expect(result).toHaveLength(0);
  });

  describe("결제 취소 및 환불 내역 파싱", () => {
    it("승인취소 키워드가 포함된 경우 금액을 음수로 파싱한다", () => {
      const text = "[신한체크취소] 09/04 11:20 스타벅스 5,500원 승인취소";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -5500,
        category: "cafe",
      });
    });

    it("결제취소 키워드와 인명이 포함된 경우 상호명과 음수 금액을 올바르게 파싱한다", () => {
      const text = "[KB국민카드] 결제취소 홍길동 15,000원 스타벅스";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -15000,
        category: "cafe",
      });
    });

    it("마이너스 부호(-)가 포함된 결제 건의 금액을 음수로 변환한다", () => {
      const text = "[현대카드] 스타벅스 -12,000원 결제취소";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "스타벅스",
        amount: -12000,
        category: "cafe",
      });
    });

    it("특수 음수 부호(▲)가 포함된 환불 건을 음수로 변환한다", () => {
      const text = "쿠팡 ▲42,900원 환불";
      const result = parseTextLocally(text);
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        merchant: "쿠팡",
        amount: -42900,
        category: "onlineShopping",
      });
    });

    it("정상 결제와 결제 취소가 혼합된 멀티라인 텍스트를 각각 올바른 부호로 파싱한다", () => {
      const text = `
        [신한체크승인] GS25강남역점 4,500원
        [신한체크취소] 09/04 11:20 스타벅스 5,500원 승인취소
        쿠팡 결제 42,900원
        [롯데카드] 배달의민족 24,000원 환불
      `;
      const result = parseTextLocally(text);
      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ merchant: "GS25강남역점", amount: 4500, category: "convenience" });
      expect(result[1]).toEqual({ merchant: "스타벅스", amount: -5500, category: "cafe" });
      expect(result[2]).toEqual({ merchant: "쿠팡", amount: 42900, category: "onlineShopping" });
      expect(result[3]).toEqual({ merchant: "배달의민족", amount: -24000, category: "dining" });
    });
  });
});
