/**
 * [Issue #85] 가맹점-카테고리 자동 분류 규칙(사전) 커스텀 관리 유틸리티
 * - 사용자 정의 키워드 -> 카테고리 매핑 규칙 CRUD
 * - localStorage 영구 저장 및 탭 간 동기화 이벤트
 * - 키워드 유효성 검사 (빈 값 방지, 공백 정규화, 중복 방지)
 * - 내보내기(JSON 백업) 및 불러오기(JSON 복원)
 * - 파서 연동용 우선순위 매칭 엔진
 */

export interface CustomMerchantRule {
  id: string;
  keyword: string;
  category: string;
  createdAt: number;
}

export const MERCHANT_RULES_STORAGE_KEY = "card-recommend:custom-merchant-rules";
export const MERCHANT_RULES_EVENT = "card-recommend:merchant-rules-updated";

/**
 * 키워드 유효성 검증
 */
export function validateMerchantRuleKeyword(
  keyword: string,
  existingRules: CustomMerchantRule[] = [],
  excludeId?: string
): { isValid: boolean; error?: string } {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return { isValid: false, error: "키워드를 입력해 주세요." };
  }

  if (trimmed.length > 50) {
    return { isValid: false, error: "키워드는 최대 50자 이하로 입력해 주세요." };
  }

  const normalized = trimmed.toLowerCase();
  const isDuplicate = existingRules.some(
    (rule) => rule.id !== excludeId && rule.keyword.trim().toLowerCase() === normalized
  );

  if (isDuplicate) {
    return { isValid: false, error: `이미 등록된 키워드입니다: '${trimmed}'` };
  }

  return { isValid: true };
}

/**
 * 저장된 사용자 정의 가맹점 분류 룰 읽기
 */
export function getStoredMerchantRules(): CustomMerchantRule[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }

  try {
    const raw = localStorage.getItem(MERCHANT_RULES_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is CustomMerchantRule =>
        Boolean(item) &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.keyword === "string" &&
        item.keyword.trim().length > 0 &&
        typeof item.category === "string" &&
        item.category.trim().length > 0
    );
  } catch {
    return [];
  }
}

/**
 * 사용자 정의 가맹점 분류 룰 저장 및 갱신 이벤트 전파
 */
export function saveStoredMerchantRules(rules: CustomMerchantRule[]): void {
  if (typeof window === "undefined" || !window.localStorage) return;

  try {
    localStorage.setItem(MERCHANT_RULES_STORAGE_KEY, JSON.stringify(rules));
    window.dispatchEvent(new CustomEvent(MERCHANT_RULES_EVENT, { detail: rules }));
  } catch {
    // QuotaExceededError 등 예외 방어
  }
}

/**
 * 새 커스텀 규칙 등록
 */
export function addMerchantRule(
  keyword: string,
  category: string
): { success: boolean; rule?: CustomMerchantRule; error?: string } {
  const currentRules = getStoredMerchantRules();
  const validation = validateMerchantRuleKeyword(keyword, currentRules);

  if (!validation.isValid) {
    return { success: false, error: validation.error };
  }

  const trimmedCategory = category.trim();
  if (!trimmedCategory) {
    return { success: false, error: "카테고리를 선택해 주세요." };
  }

  const newRule: CustomMerchantRule = {
    id: `rule_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    keyword: keyword.trim(),
    category: trimmedCategory,
    createdAt: Date.now(),
  };

  const updatedRules = [newRule, ...currentRules];
  saveStoredMerchantRules(updatedRules);

  return { success: true, rule: newRule };
}

/**
 * 기존 커스텀 규칙 수정
 */
export function updateMerchantRule(
  id: string,
  updates: { keyword?: string; category?: string }
): { success: boolean; rule?: CustomMerchantRule; error?: string } {
  const currentRules = getStoredMerchantRules();
  const targetIndex = currentRules.findIndex((r) => r.id === id);

  if (targetIndex === -1) {
    return { success: false, error: "수정할 규칙을 찾을 수 없습니다." };
  }

  const current = currentRules[targetIndex];
  const nextKeyword = updates.keyword !== undefined ? updates.keyword.trim() : current.keyword;
  const nextCategory = updates.category !== undefined ? updates.category.trim() : current.category;

  if (updates.keyword !== undefined) {
    const validation = validateMerchantRuleKeyword(nextKeyword, currentRules, id);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }
  }

  if (!nextCategory) {
    return { success: false, error: "카테고리를 선택해 주세요." };
  }

  const updatedRule: CustomMerchantRule = {
    ...current,
    keyword: nextKeyword,
    category: nextCategory,
  };

  const nextRules = [...currentRules];
  nextRules[targetIndex] = updatedRule;
  saveStoredMerchantRules(nextRules);

  return { success: true, rule: updatedRule };
}

/**
 * 기존 커스텀 규칙 삭제
 */
export function deleteMerchantRule(id: string): boolean {
  const currentRules = getStoredMerchantRules();
  const filtered = currentRules.filter((r) => r.id !== id);

  if (filtered.length === currentRules.length) {
    return false;
  }

  saveStoredMerchantRules(filtered);
  return true;
}

/**
 * 모든 커스텀 규칙 초기화 (기본값 복원)
 */
export function resetMerchantRules(): void {
  saveStoredMerchantRules([]);
}

/**
 * 백업 데이터 스키마
 */
export interface MerchantRulesBackupData {
  version: 1;
  exportedAt: string;
  rulesCount: number;
  rules: CustomMerchantRule[];
}

export type ValidateRulesBackupResult =
  | { success: true; rules: CustomMerchantRule[]; count: number }
  | { success: false; error: string };

/**
 * 커스텀 규칙 목록을 JSON 문자열로 내보내기
 */
export function exportMerchantRules(rules?: CustomMerchantRule[]): string {
  const targetRules = rules || getStoredMerchantRules();
  const backupData: MerchantRulesBackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    rulesCount: targetRules.length,
    rules: targetRules,
  };
  return JSON.stringify(backupData, null, 2);
}

/**
 * 백업 JSON 문자열 파싱 및 스키마 검증
 */
export function parseAndValidateMerchantRulesBackup(rawJson: string): ValidateRulesBackupResult {
  if (!rawJson || !rawJson.trim()) {
    return { success: false, error: "파일 내용이 비어 있습니다." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { success: false, error: "올바른 JSON 형식이 아닙니다." };
  }

  let rawRules: unknown;
  if (Array.isArray(parsed)) {
    rawRules = parsed;
  } else if (parsed && typeof parsed === "object" && "rules" in parsed) {
    rawRules = (parsed as { rules: unknown }).rules;
  } else {
    return { success: false, error: "가맹점 분류 규칙 백업 형식과 일치하지 않습니다." };
  }

  if (!Array.isArray(rawRules)) {
    return { success: false, error: "규칙 목록(rules)이 배열 형식이 아닙니다." };
  }

  if (rawRules.length === 0) {
    return { success: false, error: "백업 파일에 저장된 분류 규칙이 없습니다." };
  }

  const validRules: CustomMerchantRule[] = [];
  const seenKeywords = new Set<string>();

  for (let i = 0; i < rawRules.length; i++) {
    const item = rawRules[i];
    if (
      !item ||
      typeof item !== "object" ||
      typeof item.keyword !== "string" ||
      !item.keyword.trim() ||
      typeof item.category !== "string" ||
      !item.category.trim()
    ) {
      return { success: false, error: `${i + 1}번째 행의 규칙 정보가 올바르지 않습니다.` };
    }

    const keyword = item.keyword.trim();
    const normalized = keyword.toLowerCase();
    if (seenKeywords.has(normalized)) {
      continue; // 중복 키워드는 최초 1개만 수용
    }
    seenKeywords.add(normalized);

    validRules.push({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `rule_${Date.now()}_${i}`,
      keyword,
      category: item.category.trim(),
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    });
  }

  if (validRules.length === 0) {
    return { success: false, error: "유효한 분류 규칙을 찾을 수 없습니다." };
  }

  return { success: true, rules: validRules, count: validRules.length };
}

/**
 * 커스텀 규칙 백업 JSON 파일 다운로드 트리거
 */
export function downloadMerchantRulesBackup(rules?: CustomMerchantRule[]): void {
  const jsonString = exportMerchantRules(rules);
  const blob = new Blob([jsonString], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `merchant-rules-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 가맹점명 및 업종명과 매칭되는 사용자 커스텀 규칙 탐색 (긴 키워드 우선)
 */
export function matchCustomMerchantRule(
  merchant: string,
  sector?: string,
  rules?: CustomMerchantRule[]
): CustomMerchantRule | null {
  const targetRules = rules !== undefined ? rules : getStoredMerchantRules();
  if (!targetRules || targetRules.length === 0) return null;

  const combinedText = `${merchant} ${sector || ""}`.toLowerCase();

  // 더 구체적이고 긴 키워드가 우선 매칭되도록 정렬
  const sortedRules = [...targetRules].sort((a, b) => b.keyword.length - a.keyword.length);

  for (const rule of sortedRules) {
    const kw = rule.keyword.trim().toLowerCase();
    if (kw && combinedText.includes(kw)) {
      return rule;
    }
  }

  return null;
}
