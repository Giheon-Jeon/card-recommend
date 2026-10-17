import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getStoredMerchantRules,
  addMerchantRule,
  updateMerchantRule,
  deleteMerchantRule,
  resetMerchantRules,
  validateMerchantRuleKeyword,
  exportMerchantRules,
  parseAndValidateMerchantRulesBackup,
  matchCustomMerchantRule,
  type CustomMerchantRule,
} from "@/lib/merchantRules";

describe("merchantRules.ts 유틸리티 단위 테스트", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe("validateMerchantRuleKeyword", () => {
    it("빈 문자열이나 공백만 입력된 경우 유효하지 않아야 한다", () => {
      expect(validateMerchantRuleKeyword("").isValid).toBe(false);
      expect(validateMerchantRuleKeyword("   ").isValid).toBe(false);
    });

    it("50자를 초과하는 키워드는 유효하지 않아야 한다", () => {
      const longKeyword = "a".repeat(51);
      const result = validateMerchantRuleKeyword(longKeyword);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("최대 50자");
    });

    it("중복된 키워드인 경우(대소문자 무관) 에러를 반환해야 한다", () => {
      const existing: CustomMerchantRule[] = [
        { id: "1", keyword: "스타벅스", category: "cafe", createdAt: 1 },
        { id: "2", keyword: "COUPANG", category: "onlineShopping", createdAt: 2 },
      ];

      expect(validateMerchantRuleKeyword("스타벅스", existing).isValid).toBe(false);
      expect(validateMerchantRuleKeyword("  스타벅스  ", existing).isValid).toBe(false);
      expect(validateMerchantRuleKeyword("coupang", existing).isValid).toBe(false);
    });

    it("자기 자신의 id를 제외한 중복 검사 시 수정을 허용해야 한다", () => {
      const existing: CustomMerchantRule[] = [
        { id: "1", keyword: "스타벅스", category: "cafe", createdAt: 1 },
      ];

      // 동일 id인 1에 대한 수정은 동일 키워드라도 유효함
      expect(validateMerchantRuleKeyword("스타벅스", existing, "1").isValid).toBe(true);
    });
  });

  describe("CRUD 작업 및 스토리지 동기화", () => {
    it("초기 스토리지 상태에서 getStoredMerchantRules는 빈 배열을 반환해야 한다", () => {
      expect(getStoredMerchantRules()).toEqual([]);
    });

    it("addMerchantRule로 새로운 규칙을 등록하고 스토리지에 저장되어야 한다", () => {
      const result = addMerchantRule("동네마트", "mart");
      expect(result.success).toBe(true);
      expect(result.rule?.keyword).toBe("동네마트");
      expect(result.rule?.category).toBe("mart");

      const stored = getStoredMerchantRules();
      expect(stored.length).toBe(1);
      expect(stored[0].keyword).toBe("동네마트");
    });

    it("동일 키워드를 중복 등록하려 하면 실패해야 한다", () => {
      addMerchantRule("동네마트", "mart");
      const duplicateResult = addMerchantRule("동네마트", "convenience");
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.error).toContain("이미 등록된 키워드");
    });

    it("updateMerchantRule로 키워드 및 카테고리를 정상 수정할 수 있어야 한다", () => {
      const addRes = addMerchantRule("텐퍼센트커피", "dining");
      const ruleId = addRes.rule!.id;

      const updateRes = updateMerchantRule(ruleId, { category: "cafe" });
      expect(updateRes.success).toBe(true);
      expect(updateRes.rule?.category).toBe("cafe");

      const stored = getStoredMerchantRules();
      expect(stored[0].category).toBe("cafe");
    });

    it("존재하지 않는 규칙 id 수정 시 실패해야 한다", () => {
      const result = updateMerchantRule("non-existent-id", { category: "cafe" });
      expect(result.success).toBe(false);
      expect(result.error).toContain("찾을 수 없습니다");
    });

    it("deleteMerchantRule로 특정 규칙을 삭제할 수 있어야 한다", () => {
      const addRes = addMerchantRule("삭제대상", "etc");
      const ruleId = addRes.rule!.id;

      expect(getStoredMerchantRules().length).toBe(1);

      const deleted = deleteMerchantRule(ruleId);
      expect(deleted).toBe(true);
      expect(getStoredMerchantRules().length).toBe(0);
    });

    it("resetMerchantRules 호출 시 모든 커스텀 규칙이 초기화되어야 한다", () => {
      addMerchantRule("룰1", "cafe");
      addMerchantRule("룰2", "mart");
      expect(getStoredMerchantRules().length).toBe(2);

      resetMerchantRules();
      expect(getStoredMerchantRules().length).toBe(0);
    });
  });

  describe("백업 및 복원 검증", () => {
    it("exportMerchantRules는 버전 1 스키마의 정형 JSON 문자열을 생성해야 한다", () => {
      const rules: CustomMerchantRule[] = [
        { id: "r1", keyword: "테스트마트", category: "mart", createdAt: 12345 },
      ];
      const json = exportMerchantRules(rules);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe(1);
      expect(parsed.rulesCount).toBe(1);
      expect(parsed.rules[0].keyword).toBe("테스트마트");
    });

    it("parseAndValidateMerchantRulesBackup은 유효한 백업 JSON을 정상 복원해야 한다", () => {
      const validJson = JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        rulesCount: 2,
        rules: [
          { id: "r1", keyword: "우리동네베이커리", category: "cafe" },
          { id: "r2", keyword: "알뜰주유소", category: "gas" },
        ],
      });

      const result = parseAndValidateMerchantRulesBackup(validJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(2);
        expect(result.rules[0].keyword).toBe("우리동네베이커리");
      }
    });

    it("배열 형태의 JSON 백업도 지원해야 한다", () => {
      const arrayJson = JSON.stringify([
        { keyword: "직접등록", category: "transport" },
      ]);

      const result = parseAndValidateMerchantRulesBackup(arrayJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.count).toBe(1);
        expect(result.rules[0].keyword).toBe("직접등록");
      }
    });

    it("잘못된 JSON 형식이나 빈 문자열은 실패해야 한다", () => {
      expect(parseAndValidateMerchantRulesBackup("").success).toBe(false);
      expect(parseAndValidateMerchantRulesBackup("invalid json").success).toBe(false);
      expect(parseAndValidateMerchantRulesBackup("{}").success).toBe(false);
      expect(parseAndValidateMerchantRulesBackup(JSON.stringify({ rules: [] })).success).toBe(false);
    });
  });

  describe("matchCustomMerchantRule 매칭 엔진", () => {
    const rules: CustomMerchantRule[] = [
      { id: "1", keyword: "스타벅스", category: "cafe", createdAt: 1 },
      { id: "2", keyword: "스타벅스 리저브", category: "dining", createdAt: 2 },
      { id: "3", keyword: "행복마트", category: "mart", createdAt: 3 },
    ];

    it("가맹점명에 키워드가 포함되어 있으면 일치하는 규칙을 반환해야 한다", () => {
      const match = matchCustomMerchantRule("행복마트 역삼점", undefined, rules);
      expect(match).not.toBeNull();
      expect(match?.category).toBe("mart");
    });

    it("업종명에 키워드가 포함되어 있어도 매칭되어야 한다", () => {
      const match = matchCustomMerchantRule("모던스토어", "행복마트 계열", rules);
      expect(match).not.toBeNull();
      expect(match?.category).toBe("mart");
    });

    it("더 길고 구체적인 키워드가 우선 매칭되어야 한다 (스타벅스 vs 스타벅스 리저브)", () => {
      const match = matchCustomMerchantRule("스타벅스 리저브 청담점", undefined, rules);
      expect(match).not.toBeNull();
      expect(match?.keyword).toBe("스타벅스 리저브");
      expect(match?.category).toBe("dining");
    });

    it("매칭되는 규칙이 없으면 null을 반환해야 한다", () => {
      const match = matchCustomMerchantRule("완전히 다른 상점", undefined, rules);
      expect(match).toBeNull();
    });
  });
});
