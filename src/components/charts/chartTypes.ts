import type { CategoryId } from "@/types/card";

export interface ChartDataItem {
  id: string;
  label: string;
  value: number;
  color?: string;
  sublabel?: string;
  percentage?: number;
}

/** 카테고리별 일관된 테마 색상 팔레트 (다크 모드에서도 시인성이 뛰어난 색상) */
export const CATEGORY_COLORS: Record<CategoryId, string> = {
  convenience: "#10B981", // Emerald 500 (편의점)
  cafe: "#F59E0B", // Amber 500 (카페/디저트)
  transport: "#3B82F6", // Blue 500 (대중교통)
  mobile: "#6366F1", // Indigo 500 (통신비)
  onlineShopping: "#EC4899", // Pink 500 (온라인쇼핑)
  mart: "#8B5CF6", // Violet 500 (대형마트/슈퍼)
  dining: "#F97316", // Orange 500 (외식)
  culture: "#06B6D4", // Cyan 500 (영화/공연/OTT)
  gas: "#EF4444", // Red 500 (주유)
  etc: "#64748B", // Slate 500 (기타)
};

/** 카드 조합 및 일반 차트용 고유 색상 팔레트 */
export const DEFAULT_CHART_PALETTE: string[] = [
  "#6366F1", // Indigo 500
  "#8B5CF6", // Violet 500
  "#10B981", // Emerald 500
  "#3B82F6", // Blue 500
  "#F59E0B", // Amber 500
  "#EC4899", // Pink 500
  "#06B6D4", // Cyan 500
  "#F97316", // Orange 500
];
