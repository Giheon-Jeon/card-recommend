import type { Category } from "@/types/card";

export interface ParsedSpendingItem {
  merchant: string;
  amount: number;
  category: string; // convenience, cafe, transport, mobile, onlineShopping, mart, dining, culture, gas, etc
}

export type ImportMode = "merge" | "overwrite";

export type ImporterTabType = "text" | "image" | "csv" | "demo";

export interface ParsedItemsTableProps {
  categories: Category[];
  items: ParsedSpendingItem[];
  onUpdateItem: <K extends keyof ParsedSpendingItem>(
    index: number,
    field: K,
    value: ParsedSpendingItem[K],
  ) => void;
  onDeleteItem: (index: number) => void;
  onDeleteSelected?: (indices: number[]) => void;
  onAddItem?: () => void;
  importMode: ImportMode;
  onImportModeChange: (mode: ImportMode) => void;
  onCancel: () => void;
  onApply: () => void;
}
