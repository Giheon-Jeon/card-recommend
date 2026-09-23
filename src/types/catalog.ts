export type CatalogCardType = "신용" | "체크" | "기타";

export interface CatalogEntry {
  sourceId: number;
  sourceUrl: string;
  name: string;
  issuer: string;
  category: string;
  annualFeeText?: string;
  annualFee?: number;
  imageUrl?: string;
  benefitSummary?: string;
  fetchedAt: string;
}
