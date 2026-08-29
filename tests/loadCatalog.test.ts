import { describe, it, expect } from "vitest";
import { categories, catalogCards, catalogIssuers, catalogTypes, isInfoInsufficient } from "@/lib/loadCatalog";
import type { CatalogEntry } from "@/types/catalog";

describe("loadCatalog - constants", () => {
  it("categories는 비어있지 않은 배열이어야 하며 Category 객체 속성을 가져야 한다", () => {
    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toHaveProperty("id");
    expect(categories[0]).toHaveProperty("label");
  });

  it("catalogCards의 모든 항목은 유효한 카드 이름을 가져야 한다", () => {
    expect(catalogCards.length).toBeGreaterThan(0);
    catalogCards.forEach((card) => {
      expect(card.name.trim().length).toBeGreaterThan(0);
    });
  });

  it("catalogIssuers는 고유하며 한글 자모/가나다순으로 정렬되어야 한다", () => {
    expect(catalogIssuers.length).toBeGreaterThan(0);
    
    // 중복 검사
    const uniqueIssuers = new Set(catalogIssuers);
    expect(uniqueIssuers.size).toBe(catalogIssuers.length);

    // 정렬 검사 (원래 배열과 정렬한 배열 비교)
    const sorted = [...catalogIssuers].sort((a, b) => a.localeCompare(b, "ko"));
    expect(catalogIssuers).toEqual(sorted);
  });

  it("catalogTypes는 고유하며 한글 자모/가나다순으로 정렬되어야 한다", () => {
    expect(catalogTypes.length).toBeGreaterThan(0);

    // 중복 검사
    const uniqueTypes = new Set(catalogTypes);
    expect(uniqueTypes.size).toBe(catalogTypes.length);

    // 정렬 검사
    const sorted = [...catalogTypes].sort((a, b) => a.localeCompare(b, "ko"));
    expect(catalogTypes).toEqual(sorted);
  });
});

describe("loadCatalog - isInfoInsufficient", () => {
  it("연회비와 혜택 요약이 모두 있으면 false를 반환해야 한다", () => {
    const entry: CatalogEntry = {
      sourceId: 1,
      sourceUrl: "",
      name: "정상 카드",
      issuer: "A사",
      category: "신용카드",
      annualFee: { "국내전용": 10000 },
      annualFeeText: "1만원",
      benefitSummary: "카페 10% 할인",
      benefits: [],
    };
    expect(isInfoInsufficient(entry)).toBe(false);
  });

  it("연회비가 없고 혜택 요약만 있으면 false를 반환해야 한다 (예: 연회비 없음 카드)", () => {
    const entry: CatalogEntry = {
      sourceId: 2,
      sourceUrl: "",
      name: "연회비 없음 카드",
      issuer: "B사",
      category: "체크카드",
      benefitSummary: "편의점 5% 할인",
      benefits: [],
    };
    expect(isInfoInsufficient(entry)).toBe(false);
  });

  it("연회비는 있으나 혜택 요약이 없으면 false를 반환해야 한다", () => {
    const entry: CatalogEntry = {
      sourceId: 3,
      sourceUrl: "",
      name: "혜택 요약 없는 카드",
      issuer: "C사",
      category: "신용카드",
      annualFee: { "국내전용": 5000 },
      annualFeeText: "5천원",
      benefitSummary: "",
      benefits: [],
    };
    expect(isInfoInsufficient(entry)).toBe(false);
  });

  it("연회비와 혜택 요약이 모두 비어있거나 undefined이면 true를 반환해야 한다", () => {
    const entry: CatalogEntry = {
      sourceId: 4,
      sourceUrl: "",
      name: "부실 카드",
      issuer: "D사",
      category: "신용카드",
      benefitSummary: "   ", // 공백만 있는 경우
      benefits: [],
    };
    expect(isInfoInsufficient(entry)).toBe(true);
  });
});
