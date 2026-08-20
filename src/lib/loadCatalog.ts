import type { CatalogEntry } from "@/types/catalog";
import catalogJson from "@data/catalog/cards-catalog.json";

const raw = catalogJson as CatalogEntry[];

// 이름이 비어있는 항목(사이트맵 오탐 등)은 카드 목록에서 제외합니다.
export const catalogCards: CatalogEntry[] = raw.filter((entry) => entry.name.trim().length > 0);

export const catalogIssuers: string[] = Array.from(
  new Set(catalogCards.map((c) => c.issuer).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "ko"));

export const catalogTypes: string[] = Array.from(
  new Set(catalogCards.map((c) => c.category).filter(Boolean)),
).sort((a, b) => a.localeCompare(b, "ko"));
