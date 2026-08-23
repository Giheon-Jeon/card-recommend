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
});
