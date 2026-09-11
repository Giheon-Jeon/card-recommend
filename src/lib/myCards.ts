import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "card-recommend:my-cards";

export interface MyCardsBackupData {
  version: 1;
  exportedAt: string;
  cardCount: number;
  cardIds: number[];
}

export type ValidateBackupResult =
  | { success: true; cardIds: number[]; count: number }
  | { success: false; error: string };

export function exportMyCards(ids: number[]): string {
  const data: MyCardsBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    cardCount: ids.length,
    cardIds: [...ids],
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
  if (Array.isArray(parsed)) {
    rawIds = parsed;
  } else if (parsed && typeof parsed === "object" && "cardIds" in parsed) {
    rawIds = (parsed as { cardIds: unknown }).cardIds;
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
  return { success: true, cardIds: uniqueIds, count: uniqueIds.length };
}

export function downloadMyCardsBackup(ids: number[]) {
  const jsonString = exportMyCards(ids);
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

function readStoredIds(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "number") : [];
  } catch {
    return [];
  }
}

function writeStoredIds(ids: number[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

/**
 * 카탈로그 카드(sourceId)를 "내 카드"로 담아 localStorage에 저장합니다.
 * 브라우저 탭 간 동기화를 위해 storage 이벤트도 반영합니다.
 */
export function useMyCards() {
  const [ids, setIds] = useState<number[]>(() => readStoredIds());

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setIds(readStoredIds());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const add = useCallback((sourceId: number) => {
    setIds((prev) => {
      if (prev.includes(sourceId)) return prev;
      const next = [...prev, sourceId];
      writeStoredIds(next);
      return next;
    });
  }, []);

  const remove = useCallback((sourceId: number) => {
    setIds((prev) => {
      const next = prev.filter((id) => id !== sourceId);
      writeStoredIds(next);
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

  const importIds = useCallback((newIds: number[], mode: "merge" | "overwrite" = "merge") => {
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
    return affectedCount;
  }, []);

  const clear = useCallback(() => {
    setIds([]);
    writeStoredIds([]);
  }, []);

  return { ids, add, remove, toggle, has, importIds, clear };
}
