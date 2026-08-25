import type { Card } from "@/types/card";
import type { Category } from "@/types/card";
import categoriesJson from "@data/categories.json";

// data/cards 폴더에 있는 모든 JSON 파일을 빌드 시점에 정적으로 불러옵니다.
// 카드를 추가/삭제할 때는 이 폴더에 JSON 파일만 추가/삭제하면 됩니다.
// import.meta.glob은 alias가 아닌 상대/절대 경로만 안정적으로 지원하므로 상대경로를 사용합니다.
const cardModules = import.meta.glob("../../data/cards/*.json", { eager: true }) as Record<
  string,
  { default: Card }
>;

// 전월실적 구간까지 직접 구조화한 수동 카드 데이터입니다. 현재 UI는 카탈로그
// 기반(loadCatalog.ts + cardConverter.ts)으로 동작하므로 이 값은 화면에 자동 반영되지
// 않으며, npm run validate:cards로 형식만 검증됩니다.
export const cards: Card[] = Object.values(cardModules)
  .map((mod) => mod.default)
  .sort((a, b) => a.name.localeCompare(b.name));

export const categories: Category[] = categoriesJson as Category[];
