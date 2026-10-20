import { describe, it, expect } from "vitest";
import {
  extractTokens,
  buildCatalogIndex,
  getDefaultCatalogIndex,
  searchCatalogIndexed,
} from "@/lib/catalogIndex";
import type { CatalogEntry } from "@/types/catalog";
import { catalogCards } from "@/lib/loadCatalog";

describe("catalogIndex - extractTokens", () => {
  it("문자열에서 단어 및 n-gram 토큰을 정상 추출해야 한다", () => {
    const tokens = extractTokens("신한카드 Mr.Life");
    expect(tokens).toContain("신한카드");
    expect(tokens).toContain("life");
    expect(tokens).toContain("신한");
    expect(tokens).toContain("mr");
  });

  it("빈 문자열이나 공백 처리 시 빈 배열을 반환해야 한다", () => {
    expect(extractTokens("")).toEqual([]);
    expect(extractTokens("   ")).toEqual([]);
  });
});

describe("catalogIndex - buildCatalogIndex & searchCatalogIndexed", () => {
  const mockCards: CatalogEntry[] = [
    {
      sourceId: 101,
      sourceUrl: "",
      name: "신한카드 Mr.Life",
      issuer: "신한카드",
      category: "신용",
      annualFee: 15000,
      benefitSummary: "공과금 10%, 마트 10% 할인",
      fetchedAt: "2026-01-01",
    },
    {
      sourceId: 102,
      sourceUrl: "",
      name: "KB국민 My WE:SH 카드",
      issuer: "KB국민카드",
      category: "신용",
      annualFee: 15000,
      benefitSummary: "KB Pay 10%, 음식점 10% 할인",
      fetchedAt: "2026-01-01",
    },
    {
      sourceId: 103,
      sourceUrl: "",
      name: "신한카드 Deep Dream 체크",
      issuer: "신한카드",
      category: "체크",
      annualFee: 0,
      benefitSummary: "전가맹점 0.2% 포인트 적립",
      fetchedAt: "2026-01-01",
    },
    {
      sourceId: 104,
      sourceUrl: "",
      name: "정보부족 카드",
      issuer: "현대카드",
      category: "신용",
      benefitSummary: "",
      fetchedAt: "2026-01-01",
    },
  ];

  it("인덱스가 카드사, 카테고리, 토큰 맵을 올바르게 구축해야 한다", () => {
    const index = buildCatalogIndex(mockCards);
    expect(index.issuerMap.get("신한카드")).toEqual([101, 103]);
    expect(index.categoryMap.get("체크")).toEqual([103]);
    expect(index.validInfoCardIds.has(104)).toBe(false);
  });

  it("카드사 필터링이 정상 동작해야 한다", () => {
    const index = buildCatalogIndex(mockCards);
    const results = searchCatalogIndexed({ issuer: "신한카드" }, index);
    expect(results).toHaveLength(2);
    expect(results.map((c) => c.sourceId)).toEqual([101, 103]);
  });

  it("카드 유형(체크/신용) 필터링이 정상 동작해야 한다", () => {
    const index = buildCatalogIndex(mockCards);
    const results = searchCatalogIndexed({ type: "체크" }, index);
    expect(results).toHaveLength(1);
    expect(results[0].sourceId).toBe(103);
  });

  it("검색어(카드명 또는 카드사) 검색이 정상 동작해야 한다", () => {
    const index = buildCatalogIndex(mockCards);
    const results = searchCatalogIndexed({ query: "Mr.Life" }, index);
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("신한카드 Mr.Life");

    const kbResults = searchCatalogIndexed({ query: "국민" }, index);
    expect(kbResults).toHaveLength(1);
    expect(kbResults[0].sourceId).toBe(102);
  });

  it("hideInsufficient 옵션 활성화 시 정보 부족 카드를 제외해야 한다", () => {
    const index = buildCatalogIndex(mockCards);
    const withInsufficient = searchCatalogIndexed({}, index);
    expect(withInsufficient).toHaveLength(4);

    const hidden = searchCatalogIndexed({ hideInsufficient: true }, index);
    expect(hidden).toHaveLength(3);
    expect(hidden.some((c) => c.sourceId === 104)).toBe(false);
  });

  it("실제 카탈로그 전체에 대해 기본 인덱스가 올바르게 동작해야 한다", () => {
    const defaultIndex = getDefaultCatalogIndex();
    expect(defaultIndex.cards.length).toBe(catalogCards.length);
    expect(defaultIndex.tokenMap.size).toBeGreaterThan(100);

    const searchResults = searchCatalogIndexed({ query: "신한" });
    expect(searchResults.length).toBeGreaterThan(0);
    searchResults.forEach((c) => {
      const match = c.name.toLowerCase().includes("신한") || c.issuer.toLowerCase().includes("신한");
      expect(match).toBe(true);
    });
  });
});
