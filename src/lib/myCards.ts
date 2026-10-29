import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "card-recommend:my-cards";
const STORAGE_META_KEY = "card-recommend:my-cards-meta";

export interface MyCardMeta {
  /** 카드 발급월 (YYYY-MM 형식, 예: "2024-05") */
  issuedMonth?: string;
  /** 연회비 청구월 (1 ~ 12) */
  annualFeeMonth?: number;
  /** 카드 유효기간 (MM/YY 형식, 예: "05/29") */
  expiryDate?: string;
}

export interface MyCardItem extends MyCardMeta {
  /** 카탈로그 카드 고유 ID */
  sourceId: number;
}

export interface MyCardsBackupData {
  version: 1;
  exportedAt: string;
  cardCount: number;
  cardIds: number[];
  items?: MyCardItem[];
}

export type ValidateBackupResult =
  | { success: true; cardIds: number[]; count: number; items?: MyCardItem[] }
  | { success: false; error: string };

/**
 * 발급월(YYYY-MM) 문자열을 검증하고 정규화합니다.
 */
export function normalizeIssuedMonth(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const match = trimmed.match(/^(\d{4})[-./](0?[1-9]|1[0-2])$/);
  if (!match) return undefined;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  if (year < 1990 || year > 2100) return undefined;

  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * 연회비 청구월(1~12)을 검증하고 정규화합니다.
 */
export function normalizeAnnualFeeMonth(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const num = typeof value === "number" ? value : parseInt(String(value).trim(), 10);
  if (!Number.isInteger(num) || num < 1 || num > 12) return undefined;
  return num;
}

/**
 * 카드 유효기간을 MM/YY 형식으로 검증하고 정규화합니다.
 * 지원 입력: "MM/YY", "M/YY", "YYYY-MM", "MMYY"
 */
export function normalizeExpiryDate(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  // 1. MM/YY 또는 M/YY 또는 MM-YY
  const mmyyMatch = trimmed.match(/^(0?[1-9]|1[0-2])\s*[/.-]\s*(\d{2})$/);
  if (mmyyMatch) {
    const month = String(parseInt(mmyyMatch[1], 10)).padStart(2, "0");
    const year = mmyyMatch[2];
    return `${month}/${year}`;
  }

  // 2. YYYY-MM 또는 YYYY/MM
  const yyyymmMatch = trimmed.match(/^(\d{4})\s*[/.-]\s*(0?[1-9]|1[0-2])$/);
  if (yyyymmMatch) {
    const year = yyyymmMatch[1].slice(-2);
    const month = String(parseInt(yyyymmMatch[2], 10)).padStart(2, "0");
    return `${month}/${year}`;
  }

  // 3. MMYY 4자리 숫자
  const compactMatch = trimmed.match(/^(0[1-9]|1[0-2])(\d{2})$/);
  if (compactMatch) {
    return `${compactMatch[1]}/${compactMatch[2]}`;
  }

  return undefined;
}

/**
 * 카드 메타데이터 객체를 정제합니다.
 */
export function sanitizeCardMeta(meta?: Partial<MyCardMeta> | null): MyCardMeta {
  if (!meta || typeof meta !== "object") return {};

  const issuedMonth = normalizeIssuedMonth(meta.issuedMonth);
  const annualFeeMonth = normalizeAnnualFeeMonth(meta.annualFeeMonth);
  const expiryDate = normalizeExpiryDate(meta.expiryDate);

  const sanitized: MyCardMeta = {};
  if (issuedMonth !== undefined) sanitized.issuedMonth = issuedMonth;
  if (annualFeeMonth !== undefined) sanitized.annualFeeMonth = annualFeeMonth;
  if (expiryDate !== undefined) sanitized.expiryDate = expiryDate;
  return sanitized;
}

/**
 * 레거시 number[] 또는 확장된 MyCardItem[] / 백업 데이터를 MyCardItem[] 배열로 안전하게 마이그레이션합니다.
 */
export function migrateMyCardsData(
  raw: unknown,
  rawMetaMap?: unknown,
): MyCardItem[] {
  const itemMap = new Map<number, MyCardItem>();

  // 보조 메타데이터 맵 파싱
  const externalMeta = new Map<number, MyCardMeta>();
  if (rawMetaMap && typeof rawMetaMap === "object" && !Array.isArray(rawMetaMap)) {
    for (const [key, val] of Object.entries(rawMetaMap as Record<string, unknown>)) {
      const id = parseInt(key, 10);
      if (Number.isInteger(id) && id > 0 && val && typeof val === "object") {
        externalMeta.set(id, sanitizeCardMeta(val as Partial<MyCardMeta>));
      }
    }
  }

  const processEntry = (entry: unknown) => {
    if (typeof entry === "number" && Number.isInteger(entry) && entry > 0) {
      const existing = itemMap.get(entry);
      const ext = externalMeta.get(entry);
      itemMap.set(entry, {
        sourceId: entry,
        ...ext,
        ...existing,
      });
    } else if (entry && typeof entry === "object" && "sourceId" in entry) {
      const obj = entry as Record<string, unknown>;
      const id = obj.sourceId;
      if (typeof id === "number" && Number.isInteger(id) && id > 0) {
        const ext = externalMeta.get(id);
        const inlineMeta = sanitizeCardMeta({
          issuedMonth: obj.issuedMonth as string | undefined,
          annualFeeMonth: obj.annualFeeMonth as number | undefined,
          expiryDate: obj.expiryDate as string | undefined,
        });
        const existing = itemMap.get(id);
        itemMap.set(id, {
          sourceId: id,
          ...ext,
          ...existing,
          ...inlineMeta,
        });
      }
    }
  };

  if (Array.isArray(raw)) {
    raw.forEach(processEntry);
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.cardIds)) {
      obj.cardIds.forEach(processEntry);
    }
    if (Array.isArray(obj.items)) {
      obj.items.forEach(processEntry);
    }
  }

  return Array.from(itemMap.values());
}

export function exportMyCards(ids: number[], items?: MyCardItem[]): string {
  const hasMetadata =
    Array.isArray(items) &&
    items.some(
      (item) =>
        item.issuedMonth !== undefined ||
        item.annualFeeMonth !== undefined ||
        item.expiryDate !== undefined,
    );

  const data: MyCardsBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    cardCount: ids.length,
    cardIds: [...ids],
    ...(hasMetadata ? { items: items!.map((item) => ({ ...item })) } : {}),
  };
  return JSON.stringify(data, null, 2);
}

export function parseAndValidateMyCardsBackup(rawJson: string): ValidateBackupResult {
  if (!rawJson || !rawJson.trim()) {
    return { success: false, error: "파일 내용이 비어 있습니다." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: "올바른 JSON 형식이 아닙니다." };
  }

  let rawIds: unknown;
  let rawItems: unknown;

  if (Array.isArray(parsed)) {
    // 배열 원소가 MyCardItem 형태인지 확인
    if (parsed.length > 0 && typeof parsed[0] === "object" && parsed[0] !== null && "sourceId" in parsed[0]) {
      rawItems = parsed;
      rawIds = parsed.map((entry) =>
        entry && typeof entry === "object" && "sourceId" in entry
          ? (entry as { sourceId: unknown }).sourceId
          : entry,
      );
    } else {
      rawIds = parsed;
    }
  } else if (parsed && typeof parsed === "object") {
    const obj = parsed as { cardIds?: unknown; items?: unknown };
    if ("cardIds" in obj) {
      rawIds = obj.cardIds;
      rawItems = obj.items;
    } else if (Array.isArray(obj.items)) {
      rawItems = obj.items;
      rawIds = obj.items.map((entry) =>
        entry && typeof entry === "object" && "sourceId" in entry
          ? (entry as { sourceId: unknown }).sourceId
          : entry,
      );
    } else {
      return { success: false, error: "내 카드 백업 스키마와 일치하지 않는 형식입니다." };
    }
  } else {
    return { success: false, error: "내 카드 백업 스키마와 일치하지 않는 형식입니다." };
  }

  if (!Array.isArray(rawIds)) {
    return { success: false, error: "카드 목록(cardIds)이 배열 형식이 아닙니다." };
  }

  if (rawIds.length === 0) {
    return { success: false, error: "백업 파일에 저장된 카드 목록이 없습니다." };
  }

  const validIds: number[] = [];
  for (let i = 0; i < rawIds.length; i++) {
    const item = rawIds[i];
    if (typeof item !== "number" || !Number.isInteger(item) || item <= 0) {
      return { success: false, error: `유효하지 않은 카드 ID(${String(item)})가 포함되어 있습니다.` };
    }
    validIds.push(item);
  }

  const uniqueIds = Array.from(new Set(validIds));

  if (Array.isArray(rawItems)) {
    const migratedItems = migrateMyCardsData({ cardIds: uniqueIds, items: rawItems });
    return {
      success: true,
      cardIds: uniqueIds,
      count: uniqueIds.length,
      items: migratedItems,
    };
  }

  return { success: true, cardIds: uniqueIds, count: uniqueIds.length };
}

export function downloadMyCardsBackup(ids: number[], items?: MyCardItem[]) {
  const jsonString = exportMyCards(ids, items);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `my-cards-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readStoredState(): { ids: number[]; metaMap: Record<number, MyCardMeta> } {
  try {
    const rawCards = localStorage.getItem(STORAGE_KEY);
    const rawMeta = localStorage.getItem(STORAGE_META_KEY);

    const parsedCards = rawCards ? JSON.parse(rawCards) : [];
    const parsedMeta = rawMeta ? JSON.parse(rawMeta) : undefined;

    const migrated = migrateMyCardsData(parsedCards, parsedMeta);
    const ids: number[] = [];
    const metaMap: Record<number, MyCardMeta> = {};

    for (const item of migrated) {
      ids.push(item.sourceId);
      const meta = sanitizeCardMeta(item);
      if (
        meta.issuedMonth !== undefined ||
        meta.annualFeeMonth !== undefined ||
        meta.expiryDate !== undefined
      ) {
        metaMap[item.sourceId] = meta;
      }
    }

    return { ids, metaMap };
  } catch {
    return { ids: [], metaMap: {} };
  }
}

function writeStoredIds(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function writeStoredMetaMap(metaMap: Record<number, MyCardMeta>) {
  const cleanMap: Record<number, MyCardMeta> = {};
  for (const [key, val] of Object.entries(metaMap)) {
    const id = parseInt(key, 10);
    const sanitized = sanitizeCardMeta(val);
    if (
      Number.isInteger(id) &&
      id > 0 &&
      (sanitized.issuedMonth !== undefined ||
        sanitized.annualFeeMonth !== undefined ||
        sanitized.expiryDate !== undefined)
    ) {
      cleanMap[id] = sanitized;
    }
  }

  if (Object.keys(cleanMap).length === 0) {
    localStorage.removeItem(STORAGE_META_KEY);
  } else {
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(cleanMap));
  }
}

/**
 * 카탈로그 카드(sourceId) 및 카드별 메타데이터(발급월, 연회비 청구월, 유효기간)를
 * "내 카드"로 담아 localStorage에 저장합니다.
 * 레거시 number[] 포맷과 하위 호환되며 브라우저 탭 간 동기화를 지원합니다.
 */
export function useMyCards() {
  const [ids, setIds] = useState<number[]>(() => readStoredState().ids);
  const [metaMap, setMetaMap] = useState<Record<number, MyCardMeta>>(
    () => readStoredState().metaMap,
  );

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY || e.key === STORAGE_META_KEY) {
        const nextState = readStoredState();
        setIds(nextState.ids);
        setMetaMap(nextState.metaMap);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const items: MyCardItem[] = useMemo(() => {
    return ids.map((sourceId) => ({
      sourceId,
      ...(metaMap[sourceId] ?? {}),
    }));
  }, [ids, metaMap]);

  const getCardMeta = useCallback(
    (sourceId: number): MyCardMeta => {
      return metaMap[sourceId] ?? {};
    },
    [metaMap],
  );

  const updateCardMeta = useCallback(
    (sourceId: number, patch: Partial<MyCardMeta>) => {
      setMetaMap((prev) => {
        const current = prev[sourceId] ?? {};
        const merged: Partial<MyCardMeta> = {
          ...current,
          ...patch,
        };

        // 발급월이 새로 입력되었고 연회비 청구월이 아직 설정되지 않은 경우 발급월의 월(month)로 자동 추론
        if (
          patch.issuedMonth !== undefined &&
          !("annualFeeMonth" in patch) &&
          current.annualFeeMonth === undefined
        ) {
          const normalizedIssued = normalizeIssuedMonth(patch.issuedMonth);
          if (normalizedIssued) {
            const monthPart = parseInt(normalizedIssued.split("-")[1], 10);
            if (monthPart >= 1 && monthPart <= 12) {
              merged.annualFeeMonth = monthPart;
            }
          }
        }

        const sanitized = sanitizeCardMeta(merged);
        const next = { ...prev };

        if (
          sanitized.issuedMonth === undefined &&
          sanitized.annualFeeMonth === undefined &&
          sanitized.expiryDate === undefined
        ) {
          delete next[sourceId];
        } else {
          next[sourceId] = sanitized;
        }

        writeStoredMetaMap(next);
        return next;
      });
    },
    [],
  );

  const add = useCallback((sourceId: number, initialMeta?: Partial<MyCardMeta>) => {
    setIds((prev) => {
      if (prev.includes(sourceId)) return prev;
      const next = [...prev, sourceId];
      writeStoredIds(next);
      return next;
    });
    if (initialMeta) {
      updateCardMeta(sourceId, initialMeta);
    }
  }, [updateCardMeta]);

  const remove = useCallback((sourceId: number) => {
    setIds((prev) => {
      const next = prev.filter((id) => id !== sourceId);
      writeStoredIds(next);
      return next;
    });
    setMetaMap((prev) => {
      if (!(sourceId in prev)) return prev;
      const next = { ...prev };
      delete next[sourceId];
      writeStoredMetaMap(next);
      return next;
    });
  }, []);

  const toggle = useCallback((sourceId: number) => {
    setIds((prev) => {
      const next = prev.includes(sourceId)
        ? prev.filter((id) => id !== sourceId)
        : [...prev, sourceId];
      writeStoredIds(next);
      return next;
    });
  }, []);

  const has = useCallback((sourceId: number) => ids.includes(sourceId), [ids]);

  const importIds = useCallback(
    (
      newIds: number[],
      mode: "merge" | "overwrite" = "merge",
      importedItems?: MyCardItem[],
    ) => {
      let affectedCount = 0;
      setIds((prev) => {
        let next: number[];
        if (mode === "overwrite") {
          next = Array.from(new Set(newIds));
          affectedCount = next.length;
        } else {
          const set = new Set(prev);
          newIds.forEach((id) => set.add(id));
          next = Array.from(set);
          affectedCount = next.length - prev.length;
        }
        writeStoredIds(next);
        return next;
      });

      if (Array.isArray(importedItems) && importedItems.length > 0) {
        setMetaMap((prev) => {
          const base = mode === "overwrite" ? {} : { ...prev };
          for (const item of importedItems) {
            const sanitized = sanitizeCardMeta(item);
            if (
              sanitized.issuedMonth !== undefined ||
              sanitized.annualFeeMonth !== undefined ||
              sanitized.expiryDate !== undefined
            ) {
              base[item.sourceId] = {
                ...(base[item.sourceId] ?? {}),
                ...sanitized,
              };
            }
          }
          writeStoredMetaMap(base);
          return base;
        });
      } else if (mode === "overwrite") {
        setMetaMap({});
        localStorage.removeItem(STORAGE_META_KEY);
      }

      return affectedCount;
    },
    [],
  );

  const clear = useCallback(() => {
    setIds([]);
    setMetaMap({});
    writeStoredIds([]);
    localStorage.removeItem(STORAGE_META_KEY);
  }, []);

  return {
    ids,
    items,
    getCardMeta,
    updateCardMeta,
    add,
    remove,
    toggle,
    has,
    importIds,
    clear,
  };
}
