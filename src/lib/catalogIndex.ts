import type { CatalogEntry } from "@/types/catalog";
import { catalogCards, isInfoInsufficient } from "./loadCatalog";

/**
 * 텍스트에서 검색용 토큰들을 추출합니다.
 * 공백, 특수문자를 기준으로 분리하고 소문자로 정규화합니다.
 */
export function extractTokens(text: string): string[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  // 한글, 영문, 숫자 단어 추출
  const words = normalized.match(/[\p{L}\p{N}]+/gu) ?? [];
  const tokenSet = new Set<string>();

  for (const word of words) {
    tokenSet.add(word);
    // 2글자 이상의 한글/영문 서브스트링(2-gram)을 인덱스에 추가하여 부분 검색 가속
    if (word.length >= 2 && word.length <= 10) {
      for (let i = 0; i < word.length - 1; i++) {
        tokenSet.add(word.slice(i, i + 2));
        if (i + 3 <= word.length) {
          tokenSet.add(word.slice(i, i + 3));
        }
      }
    }
  }

  return Array.from(tokenSet);
}

export interface CatalogSearchIndex {
  cards: CatalogEntry[];
  cardMap: Map<number, CatalogEntry>;
  issuerMap: Map<string, number[]>;
  categoryMap: Map<string, number[]>;
  tokenMap: Map<string, Set<number>>;
  validInfoCardIds: Set<number>;
}

/**
 * 카탈로그 카드 배열로부터 인메모리 역인덱스(Inverted Index)를 생성합니다.
 */
export function buildCatalogIndex(cards: CatalogEntry[] = catalogCards): CatalogSearchIndex {
  const cardMap = new Map<number, CatalogEntry>();
  const issuerMap = new Map<string, number[]>();
  const categoryMap = new Map<string, number[]>();
  const tokenMap = new Map<string, Set<number>>();
  const validInfoCardIds = new Set<number>();

  for (const card of cards) {
    cardMap.set(card.sourceId, card);

    // 카드사별 인덱스
    if (card.issuer) {
      const list = issuerMap.get(card.issuer) ?? [];
      list.push(card.sourceId);
      issuerMap.set(card.issuer, list);
    }

    // 카드 유형(신용/체크)별 인덱스
    if (card.category) {
      const list = categoryMap.get(card.category) ?? [];
      list.push(card.sourceId);
      categoryMap.set(card.category, list);
    }

    // 정보 충분 카드 식별
    if (!isInfoInsufficient(card)) {
      validInfoCardIds.add(card.sourceId);
    }

    // 검색 토큰 인덱싱 (카드명, 카드사, 카테고리, 혜택 요약)
    const combinedText = `${card.name} ${card.issuer} ${card.category} ${card.benefitSummary ?? ""}`;
    const tokens = extractTokens(combinedText);

    for (const token of tokens) {
      let set = tokenMap.get(token);
      if (!set) {
        set = new Set<number>();
        tokenMap.set(token, set);
      }
      set.add(card.sourceId);
    }
  }

  return {
    cards,
    cardMap,
    issuerMap,
    categoryMap,
    tokenMap,
    validInfoCardIds,
  };
}

// 싱글톤 기본 인덱스 (초기 로드시 1회 생성)
let defaultIndex: CatalogSearchIndex | null = null;

export function getDefaultCatalogIndex(): CatalogSearchIndex {
  if (!defaultIndex) {
    defaultIndex = buildCatalogIndex(catalogCards);
  }
  return defaultIndex;
}

export interface CatalogFilterOptions {
  query?: string;
  issuer?: string;
  type?: string;
  hideInsufficient?: boolean;
}

/**
 * 인메모리 역색인을 활용하여 필터 조건에 맞는 카드를 고속 검색합니다.
 * 토큰 인덱스로 1차 필터링 후 질의어 서브스트링 검증을 거쳐 100% 일치성을 보장합니다.
 */
export function searchCatalogIndexed(
  options: CatalogFilterOptions = {},
  index: CatalogSearchIndex = getDefaultCatalogIndex(),
): CatalogEntry[] {
  const { query, issuer, type, hideInsufficient } = options;
  const trimmedQuery = query?.trim().toLowerCase() ?? "";

  // 1. 후보군 ID 집합 산출
  let candidateIds: Set<number> | null = null;

  // 카드사 필터
  if (issuer) {
    const issuerIds = index.issuerMap.get(issuer) ?? [];
    candidateIds = new Set(issuerIds);
    if (candidateIds.size === 0) return [];
  }

  // 카드 유형 필터
  if (type) {
    const typeIds = index.categoryMap.get(type) ?? [];
    if (candidateIds === null) {
      candidateIds = new Set(typeIds);
    } else {
      const typeSet = new Set(typeIds);
      for (const id of candidateIds) {
        if (!typeSet.has(id)) {
          candidateIds.delete(id);
        }
      }
    }
    if (candidateIds.size === 0) return [];
  }

  // 검색어 토큰 필터링
  if (trimmedQuery) {
    const qTokens = extractTokens(trimmedQuery);
    if (qTokens.length > 0) {
      for (const token of qTokens) {
        const matched = index.tokenMap.get(token);
        if (!matched) {
          // 일치하는 토큰이 아예 없으면 결과 없음
          candidateIds = new Set();
          break;
        }

        if (candidateIds === null) {
          candidateIds = new Set(matched);
        } else {
          for (const id of candidateIds) {
            if (!matched.has(id)) {
              candidateIds.delete(id);
            }
          }
        }
      }
    }
  }

  // 후보군을 CatalogEntry 배열로 변환
  const sourceList =
    candidateIds !== null
      ? Array.from(candidateIds).map((id) => index.cardMap.get(id)!).filter(Boolean)
      : index.cards;

  // 2. 세부 정밀 조건 필터링 (완전 서브스트링 검증 및 부실 카드 제외)
  return sourceList.filter((c) => {
    if (hideInsufficient && !index.validInfoCardIds.has(c.sourceId)) {
      return false;
    }
    if (trimmedQuery) {
      const nameMatch = c.name.toLowerCase().includes(trimmedQuery);
      const issuerMatch = c.issuer.toLowerCase().includes(trimmedQuery);
      if (!nameMatch && !issuerMatch) return false;
    }
    return true;
  });
}
