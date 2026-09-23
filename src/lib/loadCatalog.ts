import type { CatalogEntry } from "@/types/catalog";
import catalogJson from "@data/catalog/cards-catalog.json";
import categoriesJson from "@data/categories.json";
import type { Category } from "@/types/card";

export const categories: Category[] = categoriesJson as Category[];

const raw = catalogJson as CatalogEntry[];

// 이름이 비어있는 항목(사이트맵 오탐 등)은 카드 목록에서 제외합니다.
export const catalogCards: CatalogEntry[] = raw.filter((entry) => entry.name.trim().length > 0);

export const catalogIssuers: string[] = Array.from(
  new Set(catalogCards.map((c) => c.issuer).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "ko"));

export const catalogTypes: string[] = Array.from(
  new Set(catalogCards.map((c) => c.category).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "ko"));

/**
 * 연회비와 혜택 요약이 모두 비어있는 카드는 카드고릴라에서 기본정보조차 채워지지 않은
 * 상태로, 실제로 신청 가능한 카드인지 확인이 어렵습니다. "만들 수 없는 카드"의 근사치로 취급합니다.
 */
export function isInfoInsufficient(entry: CatalogEntry): boolean {
  const hasFee = entry.annualFee !== undefined;
  const hasSummary = Boolean(entry.benefitSummary?.trim());
  return !hasFee && !hasSummary;
}
