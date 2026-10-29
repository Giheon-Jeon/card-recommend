import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import {
  useMyCards,
  exportMyCards,
  parseAndValidateMyCardsBackup,
  migrateMyCardsData,
  normalizeIssuedMonth,
  normalizeAnnualFeeMonth,
  normalizeExpiryDate,
} from "@/lib/myCards";

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

  it("importIds(merge 모드) 호출 시 기존 카드와 중복 없이 병합되어야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2]));
    const { result } = renderHook(() => useMyCards());

    let added = 0;
    act(() => {
      added = result.current.importIds([2, 3, 4], "merge");
    });

    expect(added).toBe(2);
    expect(result.current.ids).toEqual([1, 2, 3, 4]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[1,2,3,4]");
  });

  it("importIds(overwrite 모드) 호출 시 기존 카드가 완전히 대체되어야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2]));
    const { result } = renderHook(() => useMyCards());

    let total = 0;
    act(() => {
      total = result.current.importIds([5, 6], "overwrite");
    });

    expect(total).toBe(2);
    expect(result.current.ids).toEqual([5, 6]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[5,6]");
  });

  it("clear 호출 시 모든 카드가 제거되어야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2, 3]));
    const { result } = renderHook(() => useMyCards());

    act(() => {
      result.current.clear();
    });

    expect(result.current.ids).toEqual([]);
    expect(localStorage.getItem(STORAGE_KEY)).toBe("[]");
  });

  it("updateCardMeta 호출 시 발급월, 연회비 청구월, 유효기간이 저장되고 발급월 입력 시 청구월이 자동 추론되어야 한다", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([1, 2]));
    const { result } = renderHook(() => useMyCards());

    act(() => {
      result.current.updateCardMeta(1, {
        issuedMonth: "2024-11",
        expiryDate: "11/29",
      });
    });

    expect(result.current.getCardMeta(1)).toEqual({
      issuedMonth: "2024-11",
      annualFeeMonth: 11,
      expiryDate: "11/29",
    });

    expect(result.current.items).toEqual([
      {
        sourceId: 1,
        issuedMonth: "2024-11",
        annualFeeMonth: 11,
        expiryDate: "11/29",
      },
      { sourceId: 2 },
    ]);
  });

  it("레거시 number[] 및 MyCardItem[] 혼용 저장소 데이터를 하위 호환하여 마이그레이션해야 한다", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([
        1,
        {
          sourceId: 2,
          issuedMonth: "2025-03",
          annualFeeMonth: 3,
          expiryDate: "2030-03",
        },
      ]),
    );

    const { result } = renderHook(() => useMyCards());
    expect(result.current.ids).toEqual([1, 2]);
    expect(result.current.getCardMeta(2)).toEqual({
      issuedMonth: "2025-03",
      annualFeeMonth: 3,
      expiryDate: "03/30",
    });
  });
});

describe("MyCardItem Schema Normalization & Migration", () => {
  it("normalizeIssuedMonth는 유효한 YYYY-MM 형식을 정규화하고 잘못된 입력을 거부해야 한다", () => {
    expect(normalizeIssuedMonth("2024-5")).toBe("2024-05");
    expect(normalizeIssuedMonth("2024.11")).toBe("2024-11");
    expect(normalizeIssuedMonth("2024-13")).toBeUndefined();
    expect(normalizeIssuedMonth("")).toBeUndefined();
  });

  it("normalizeAnnualFeeMonth는 1~12월 정수를 정규화하고 범위 밖 값을 거부해야 한다", () => {
    expect(normalizeAnnualFeeMonth(5)).toBe(5);
    expect(normalizeAnnualFeeMonth("12")).toBe(12);
    expect(normalizeAnnualFeeMonth(0)).toBeUndefined();
    expect(normalizeAnnualFeeMonth(13)).toBeUndefined();
  });

  it("normalizeExpiryDate는 다양한 유효기간 표기(MM/YY, YYYY-MM, MMYY)를 MM/YY로 정규화해야 한다", () => {
    expect(normalizeExpiryDate("5/29")).toBe("05/29");
    expect(normalizeExpiryDate("2029-05")).toBe("05/29");
    expect(normalizeExpiryDate("0529")).toBe("05/29");
    expect(normalizeExpiryDate("13/29")).toBeUndefined();
  });

  it("migrateMyCardsData는 레거시 숫자 배열과 메타데이터 맵을 병합해야 한다", () => {
    const migrated = migrateMyCardsData([10, 20], {
      "10": { issuedMonth: "2023-08", annualFeeMonth: 8, expiryDate: "08/28" },
    });
    expect(migrated).toEqual([
      {
        sourceId: 10,
        issuedMonth: "2023-08",
        annualFeeMonth: 8,
        expiryDate: "08/28",
      },
      { sourceId: 20 },
    ]);
  });
});

describe("MyCards Backup and Validation", () => {
  it("exportMyCards는 메타데이터와 카드 ID 목록을 포함한 올바른 JSON 문자열을 생성해야 한다", () => {
    const json = exportMyCards([10, 20, 30]);
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(1);
    expect(parsed.cardCount).toBe(3);
    expect(parsed.cardIds).toEqual([10, 20, 30]);
    expect(typeof parsed.exportedAt).toBe("string");
  });

  it("정상적인 백업 객체 JSON을 유효하게 파싱하고 중복을 제거해야 한다", () => {
    const raw = JSON.stringify({
      version: 1,
      exportedAt: "2026-09-11T00:00:00.000Z",
      cardCount: 4,
      cardIds: [101, 102, 101, 103],
    });

    const result = parseAndValidateMyCardsBackup(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.cardIds).toEqual([101, 102, 103]);
      expect(result.count).toBe(3);
    }
  });

  it("메타데이터 items가 포함된 백업 JSON도 정상 파싱하고 마이그레이션해야 한다", () => {
    const raw = exportMyCards(
      [101, 102],
      [
        {
          sourceId: 101,
          issuedMonth: "2024-11",
          annualFeeMonth: 11,
          expiryDate: "11/29",
        },
        { sourceId: 102 },
      ],
    );

    const result = parseAndValidateMyCardsBackup(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.cardIds).toEqual([101, 102]);
      expect(result.items).toEqual([
        {
          sourceId: 101,
          issuedMonth: "2024-11",
          annualFeeMonth: 11,
          expiryDate: "11/29",
        },
        { sourceId: 102 },
      ]);
    }
  });

  it("원시 배열 형태의 JSON도 호환하여 정상 파싱해야 한다", () => {
    const raw = JSON.stringify([201, 202, 203]);
    const result = parseAndValidateMyCardsBackup(raw);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.cardIds).toEqual([201, 202, 203]);
      expect(result.count).toBe(3);
    }
  });

  it("비어있는 문자열이면 실패해야 한다", () => {
    const result = parseAndValidateMyCardsBackup("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("비어 있습니다");
    }
  });

  it("JSON 형식이 깨진 문자열이면 실패해야 한다", () => {
    const result = parseAndValidateMyCardsBackup("{ invalid: json }");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("올바른 JSON 형식이 아닙니다");
    }
  });

  it("cardIds 속성이 없는 일반 객체이면 실패해야 한다", () => {
    const result = parseAndValidateMyCardsBackup(JSON.stringify({ someKey: "value" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("일치하지 않는 형식");
    }
  });

  it("cardIds가 배열이 아니면 실패해야 한다", () => {
    const result = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: "not-array" }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("배열 형식이 아닙니다");
    }
  });

  it("빈 카드 배열이면 실패해야 한다", () => {
    const result = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: [] }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("카드 목록이 없습니다");
    }
  });

  it("유효하지 않은 카드 ID(음수, 문자열, 실수 등)가 포함되어 있으면 실패해야 한다", () => {
    const stringIdResult = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: [1, "abc", 3] }));
    expect(stringIdResult.success).toBe(false);
    if (!stringIdResult.success) {
      expect(stringIdResult.error).toContain("유효하지 않은 카드 ID");
    }

    const negativeIdResult = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: [1, -5, 3] }));
    expect(negativeIdResult.success).toBe(false);

    const floatIdResult = parseAndValidateMyCardsBackup(JSON.stringify({ cardIds: [1, 2.5, 3] }));
    expect(floatIdResult.success).toBe(false);
  });
});
