import { useCallback, useEffect, useState } from "react";
import type { Category, SpendingProfile } from "@/types/card";
import type { ParsedSpendingItem } from "@/lib/importerParser";

export const SPENDING_STORAGE_KEY = "card-recommend:spending-profile";

export function getInitialSpending(categories: Category[]): SpendingProfile {
  return categories.reduce<SpendingProfile>((acc, category) => {
    acc[category.id] = 0;
    return acc;
  }, {});
}

export function getSliderMax(value: number): number {
  if (value > 5000000) return Math.ceil(value / 1000000) * 1000000;
  if (value > 3000000) return 5000000;
  if (value > 1000000) return 3000000;
  return 1000000;
}

export function readStoredSpending(categories: Category[]): SpendingProfile {
  const initial = getInitialSpending(categories);
  if (typeof window === "undefined" || !window.localStorage) {
    return initial;
  }

  try {
    const raw = localStorage.getItem(SPENDING_STORAGE_KEY);
    if (!raw) return initial;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return initial;
    }

    const merged = { ...initial };
    for (const category of categories) {
      const val = parsed[category.id];
      if (typeof val === "number" && !Number.isNaN(val) && val >= 0) {
        merged[category.id] = Math.floor(val);
      }
    }
    return merged;
  } catch {
    return initial;
  }
}

export function writeStoredSpending(spending: SpendingProfile): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.setItem(SPENDING_STORAGE_KEY, JSON.stringify(spending));
  } catch {
    // QuotaExceededError or private browsing mode fallback
  }
}

export function clearStoredSpending(): void {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    localStorage.removeItem(SPENDING_STORAGE_KEY);
  } catch {
    // ignore storage remove errors
  }
}

/**
 * 월 지출 프로필 상태를 관리하고 localStorage에 동기화하는 커스텀 훅입니다.
 */
export function useSpendingProfile(categories: Category[]) {
  const [spending, setSpendingState] = useState<SpendingProfile>(() =>
    readStoredSpending(categories),
  );

  // 다중 탭 및 외부 스토리지 변경 동기화
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === SPENDING_STORAGE_KEY) {
        setSpendingState(readStoredSpending(categories));
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [categories]);

  const updateCategory = useCallback((categoryId: string, value: number) => {
    setSpendingState((prev) => {
      const sanitizedValue = Math.max(0, Math.floor(value || 0));
      const next = { ...prev, [categoryId]: sanitizedValue };
      writeStoredSpending(next);
      return next;
    });
  }, []);

  const setSpending = useCallback(
    (updater: SpendingProfile | ((prev: SpendingProfile) => SpendingProfile)) => {
      setSpendingState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        writeStoredSpending(next);
        return next;
      });
    },
    [],
  );

  const resetSpending = useCallback(() => {
    const initial = getInitialSpending(categories);
    setSpendingState(initial);
    writeStoredSpending(initial);
  }, [categories]);

  const applyImportedItems = useCallback(
    (items: ParsedSpendingItem[], mode: "merge" | "overwrite") => {
      setSpendingState((prev) => {
        const next = mode === "overwrite" ? getInitialSpending(categories) : { ...prev };
        items.forEach((item) => {
          if (next[item.category] !== undefined) {
            next[item.category] += item.amount;
          } else {
            next["etc"] = (next["etc"] || 0) + item.amount;
          }
        });
        // 환불/취소 내역으로 인해 음수가 되지 않도록 최소 0원 하한 보정
        Object.keys(next).forEach((key) => {
          next[key] = Math.max(0, Math.floor(next[key]));
        });
        writeStoredSpending(next);
        return next;
      });
    },
    [categories],
  );

  return {
    spending,
    updateCategory,
    setSpending,
    resetSpending,
    applyImportedItems,
  };
}
