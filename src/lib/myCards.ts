import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "card-recommend:my-cards";

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

  return { ids, add, remove, toggle, has };
}
