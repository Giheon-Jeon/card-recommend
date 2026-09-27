/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { Category } from "@/types/card";
import {
  SPENDING_STORAGE_KEY,
  getInitialSpending,
  getSliderMax,
  readStoredSpending,
  writeStoredSpending,
  clearStoredSpending,
  useSpendingProfile,
} from "@/lib/spendingProfile";

const mockCategories: Category[] = [
  { id: "transport", label: "대중교통" },
  { id: "cafe", label: "카페" },
  { id: "mart", label: "마트" },
];

describe("spendingProfile 유틸리티", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("getInitialSpending은 모든 카테고리를 0원으로 초기화한다", () => {
    const initial = getInitialSpending(mockCategories);
    expect(initial).toEqual({
      transport: 0,
      cafe: 0,
      mart: 0,
    });
  });

  it("getSliderMax는 지출 금액에 따라 적절한 슬라이더 최대 한도를 반환한다", () => {
    expect(getSliderMax(0)).toBe(1000000);
    expect(getSliderMax(500000)).toBe(1000000);
    expect(getSliderMax(1000000)).toBe(1000000);
    expect(getSliderMax(1500000)).toBe(3000000);
    expect(getSliderMax(3000000)).toBe(3000000);
    expect(getSliderMax(3500000)).toBe(5000000);
    expect(getSliderMax(5000000)).toBe(5000000);
    expect(getSliderMax(6500000)).toBe(7000000);
  });

  it("readStoredSpending은 localStorage가 비어있을 때 기본값을 반환한다", () => {
    const result = readStoredSpending(mockCategories);
    expect(result).toEqual({ transport: 0, cafe: 0, mart: 0 });
  });

  it("writeStoredSpending과 readStoredSpending이 정상적으로 동기화된다", () => {
    const spending = { transport: 50000, cafe: 30000, mart: 100000 };
    writeStoredSpending(spending);

    const loaded = readStoredSpending(mockCategories);
    expect(loaded).toEqual(spending);
  });

  it("readStoredSpending은 비정상(음수, NaN, 잘못된 JSON) 데이터에 대해 안전하게 방어한다", () => {
    localStorage.setItem(
      SPENDING_STORAGE_KEY,
      JSON.stringify({ transport: -5000, cafe: "invalid", mart: 80000 }),
    );

    const loaded = readStoredSpending(mockCategories);
    expect(loaded.transport).toBe(0);
    expect(loaded.cafe).toBe(0);
    expect(loaded.mart).toBe(80000);

    localStorage.setItem(SPENDING_STORAGE_KEY, "invalid-json{{");
    const fallback = readStoredSpending(mockCategories);
    expect(fallback).toEqual({ transport: 0, cafe: 0, mart: 0 });
  });

  it("clearStoredSpending은 스토리지 데이터를 정상적으로 삭제한다", () => {
    writeStoredSpending({ transport: 10000, cafe: 0, mart: 0 });
    clearStoredSpending();
    expect(localStorage.getItem(SPENDING_STORAGE_KEY)).toBeNull();
  });
});

describe("useSpendingProfile 훅", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("초기 렌더링 시 스토리지 값을 불러온다", () => {
    localStorage.setItem(
      SPENDING_STORAGE_KEY,
      JSON.stringify({ transport: 70000, cafe: 20000, mart: 0 }),
    );

    const { result } = renderHook(() => useSpendingProfile(mockCategories));
    expect(result.current.spending.transport).toBe(70000);
    expect(result.current.spending.cafe).toBe(20000);
  });

  it("updateCategory 호출 시 상태와 localStorage가 함께 갱신된다", () => {
    const { result } = renderHook(() => useSpendingProfile(mockCategories));

    act(() => {
      result.current.updateCategory("cafe", 45000);
    });

    expect(result.current.spending.cafe).toBe(45000);
    const stored = JSON.parse(localStorage.getItem(SPENDING_STORAGE_KEY)!);
    expect(stored.cafe).toBe(45000);
  });

  it("resetSpending 호출 시 모든 카테고리가 0원으로 초기화된다", () => {
    const { result } = renderHook(() => useSpendingProfile(mockCategories));

    act(() => {
      result.current.updateCategory("transport", 100000);
    });
    expect(result.current.spending.transport).toBe(100000);

    act(() => {
      result.current.resetSpending();
    });

    expect(result.current.spending).toEqual({ transport: 0, cafe: 0, mart: 0 });
    const stored = JSON.parse(localStorage.getItem(SPENDING_STORAGE_KEY)!);
    expect(stored).toEqual({ transport: 0, cafe: 0, mart: 0 });
  });

  it("외부 스토리지 이벤트(다중 탭 변경) 발생 시 상태가 자동 동기화된다", () => {
    const { result } = renderHook(() => useSpendingProfile(mockCategories));

    const nextSpending = { transport: 30000, cafe: 15000, mart: 60000 };
    localStorage.setItem(SPENDING_STORAGE_KEY, JSON.stringify(nextSpending));

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: SPENDING_STORAGE_KEY,
        }),
      );
    });

    expect(result.current.spending).toEqual(nextSpending);
  });
});
