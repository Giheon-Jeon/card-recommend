import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { useMyCards } from "@/lib/myCards";

const STORAGE_KEY = "card-recommend:my-cards";

describe("useMyCards", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("초기 상태에 빈 배열을 반환해야 한다", () => {
    const { result } = renderHook(() => useMyCards());
    expect(result.current.ids).toEqual([]);
  });

  it("localStorage에 저장된 카드가 있으면 로드해야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    const { result } = renderHook(() => useMyCards());
    expect(result.current.ids).toEqual([1, 2, 3]);
  });

  it("add 호출 시 카드가 저장소와 상태에 추가되어야 한다", () => {
    const { result } = renderHook(() => useMyCards());
    
    act(() => {
      result.current.add(10);
    });

    expect(result.current.ids).toEqual([10]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[10]");
  });

  it("이미 존재하는 카드를 add하면 무시해야 한다", () => {
    const { result } = renderHook(() => useMyCards());

    act(() => {
      result.current.add(10);
    });
    act(() => {
      result.current.add(10);
    });

    expect(result.current.ids).toEqual([10]);
  });

  it("remove 호출 시 카드가 제거되어야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([10, 20]));
    const { result } = renderHook(() => useMyCards());

    act(() => {
      result.current.remove(10);
    });

    expect(result.current.ids).toEqual([20]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[20]");
  });

  it("toggle 호출 시 카드가 없으면 추가하고 있으면 제거해야 한다", () => {
    const { result } = renderHook(() => useMyCards());

    act(() => {
      result.current.toggle(30);
    });
    expect(result.current.ids).toEqual([30]);

    act(() => {
      result.current.toggle(30);
    });
    expect(result.current.ids).toEqual([]);
  });

  it("has 호출 시 카드의 포함 여부를 정확히 판단해야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([40]));
    const { result } = renderHook(() => useMyCards());

    expect(result.current.has(40)).toBe(true);
    expect(result.current.has(50)).toBe(false);
  });

  it("다른 탭/창에서 storage 이벤트가 발생했을 때 상태를 동기화해야 한다", () => {
    const { result } = renderHook(() => useMyCards());

    expect(result.current.ids).toEqual([]);

    // 로컬 스토리지에 데이터를 강제 업데이트하고 storage 이벤트를 dispatch
    localStorage.setItem(STORAGE_KEY, JSON.stringify([100]));
    
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: STORAGE_KEY,
          newValue: JSON.stringify([100]),
        })
      );
    });

    expect(result.current.ids).toEqual([100]);
  });
});
