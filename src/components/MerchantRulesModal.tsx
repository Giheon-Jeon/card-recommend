import { useEffect, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Download,
  Upload,
  BookOpen,
  AlertCircle,
  Search,
} from "lucide-react";
import type { Category } from "@/types/card";
import {
  getStoredMerchantRules,
  addMerchantRule,
  updateMerchantRule,
  deleteMerchantRule,
  resetMerchantRules,
  saveStoredMerchantRules,
  downloadMerchantRulesBackup,
  parseAndValidateMerchantRulesBackup,
  type CustomMerchantRule,
} from "@/lib/merchantRules";
import { useToast } from "@/hooks/useToast";

interface MerchantRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onRulesChanged?: () => void;
}

/**
 * [Issue #85] 가맹점-카테고리 자동 분류 규칙(사전) 커스텀 관리 모달
 * - 사용자 정의 키워드 -> 카테고리 매핑 규칙 CRUD
 * - 실시간 키워드 유효성 검사 및 인라인 수정 지원
 * - JSON 백업 다운로드 및 파일 불러오기 복원
 * - WAI-ARIA 명세 준수, Focus Trap, Escape 키 닫기, 스크롤 잠금 및 다크모드 지원
 */
export function MerchantRulesModal({
  isOpen,
  onClose,
  categories,
  onRulesChanged,
}: MerchantRulesModalProps) {
  const [rules, setRules] = useState<CustomMerchantRule[]>(() => getStoredMerchantRules());
  const [newKeyword, setNewKeyword] = useState("");
  const [newCategory, setNewCategory] = useState<string>(categories[0]?.id || "dining");
  const [keywordError, setKeywordError] = useState<string | null>(null);

  // 수정 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  // 검색 필터
  const [searchQuery, setSearchQuery] = useState("");
  // 초기화 확인 상태
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // 모달 열림 감지 및 상태 초기화 (React 19 권장 렌더 동기화)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setRules(getStoredMerchantRules());
      setNewKeyword("");
      setNewCategory(categories[0]?.id || "dining");
      setKeywordError(null);
      setEditingId(null);
      setSearchQuery("");
      setShowResetConfirm(false);
    }
  }

  const dialogRef = useRef<HTMLDialogElement>(null);
  const prevActiveElementRef = useRef<HTMLElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // 접근성: 포커스 관리, ESC 닫기, 배경 스크롤 차단
  useEffect(() => {
    if (!isOpen) return;

    prevActiveElementRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = setTimeout(() => {
      if (!dialogRef.current) return;
      const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length > 0) {
        focusables[0].focus();
      }
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        if (!dialogRef.current) return;
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]):not([tabindex="-1"]), [href]:not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusables.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      if (prevActiveElementRef.current && typeof prevActiveElementRef.current.focus === "function") {
        prevActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getCategoryLabel = (id: string): string => {
    return categories.find((c) => c.id === id)?.label || id;
  };

  const notifyChange = (updatedRules: CustomMerchantRule[]) => {
    setRules(updatedRules);
    if (onRulesChanged) {
      onRulesChanged();
    }
  };

  // 신규 규칙 추가 핸들러
  const handleAddRule = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setKeywordError(null);

    const result = addMerchantRule(newKeyword, newCategory);
    if (!result.success) {
      setKeywordError(result.error || "규칙 추가에 실패했습니다.");
      return;
    }

    const nextRules = getStoredMerchantRules();
    notifyChange(nextRules);
    toast.success(`'${newKeyword.trim()}' 분류 규칙이 성공적으로 추가되었습니다.`);
    setNewKeyword("");
  };

  // 인라인 수정 모드 시작
  const handleStartEdit = (rule: CustomMerchantRule) => {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditCategory(rule.category);
    setEditError(null);
  };

  // 인라인 수정 취소
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditKeyword("");
    setEditCategory("");
    setEditError(null);
  };

  // 인라인 수정 저장
  const handleSaveEdit = (id: string) => {
    setEditError(null);
    const result = updateMerchantRule(id, {
      keyword: editKeyword,
      category: editCategory,
    });

    if (!result.success) {
      setEditError(result.error || "규칙 수정에 실패했습니다.");
      return;
    }

    const nextRules = getStoredMerchantRules();
    notifyChange(nextRules);
    toast.success(`'${editKeyword.trim()}' 분류 규칙이 수정되었습니다.`);
    setEditingId(null);
  };

  // 규칙 삭제
  const handleDeleteRule = (id: string, keyword: string) => {
    deleteMerchantRule(id);
    const nextRules = getStoredMerchantRules();
    notifyChange(nextRules);
    toast.info(`'${keyword}' 분류 규칙이 삭제되었습니다.`);
  };

  // 기본값 초기화
  const handleConfirmReset = () => {
    resetMerchantRules();
    notifyChange([]);
    setShowResetConfirm(false);
    toast.info("모든 커스텀 분류 규칙이 초기화되었습니다.");
  };

  // JSON 백업 다운로드
  const handleDownloadBackup = () => {
    if (rules.length === 0) {
      toast.error("다운로드할 등록된 커스텀 규칙이 없습니다.");
      return;
    }
    downloadMerchantRulesBackup(rules);
    toast.success(`총 ${rules.length}개의 가맹점 분류 규칙이 백업 파일로 저장되었습니다.`);
  };

  // 백업 파일 불러오기 트리거
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // 백업 파일 파싱 및 적용
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const parsed = parseAndValidateMerchantRulesBackup(content);
      if (!parsed.success) {
        toast.error(`백업 복원 실패: ${parsed.error}`);
        return;
      }

      // 기존 규칙과 병합 (새로운 규칙 우선)
      const current = getStoredMerchantRules();
      const existingKwMap = new Set(current.map((r) => r.keyword.toLowerCase().trim()));
      const newItems = parsed.rules.filter((r) => !existingKwMap.has(r.keyword.toLowerCase().trim()));

      const merged = [...parsed.rules, ...current.filter((c) => !parsed.rules.some((p) => p.keyword.toLowerCase().trim() === c.keyword.toLowerCase().trim()))];
      saveStoredMerchantRules(merged);
      notifyChange(merged);

      toast.success(
        `백업 파일에서 ${parsed.count}건의 분류 규칙을 성공적으로 복원했습니다. (신규 추가: ${newItems.length}건)`
      );
    };
    reader.readAsText(file);
  };

  const filteredRules = rules.filter((rule) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const catLabel = getCategoryLabel(rule.category).toLowerCase();
    return rule.keyword.toLowerCase().includes(q) || catLabel.includes(q);
  });

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <dialog
        ref={dialogRef}
        open
        aria-modal="true"
        aria-labelledby="merchant-rules-title"
        aria-describedby="merchant-rules-desc"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-0 shadow-2xl transition-all duration-300 dark:border-slate-800 dark:bg-slate-900"
      >
        {/* 모달 헤더 */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="merchant-rules-title"
                className="text-lg font-bold text-slate-800 dark:text-slate-100"
              >
                가맹점 자동 분류 규칙 사전
              </h2>
              <p
                id="merchant-rules-desc"
                className="mt-0.5 text-xs text-slate-500 dark:text-slate-400"
              >
                자주 이용하는 가맹점의 키워드와 카테고리를 설정하면 내역 분석 시 최우선으로 자동 분류됩니다.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 모달 본문 영역 */}
        <div className="flex flex-1 flex-col overflow-y-auto p-5 space-y-5">
          {/* 1. 신규 규칙 추가 폼 */}
          <form
            onSubmit={handleAddRule}
            className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20"
          >
            <span className="block text-xs font-bold text-indigo-950 dark:text-indigo-300 mb-2">
              새 키워드 규칙 등록
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex-1">
                <input
                  type="text"
                  value={newKeyword}
                  aria-label="가맹점 키워드 입력"
                  onChange={(e) => {
                    setNewKeyword(e.target.value);
                    if (keywordError) setKeywordError(null);
                  }}
                  placeholder="가맹점 키워드 (예: 우리동네마트, 텐퍼센트커피)"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500"
                />
              </div>

              <div className="sm:w-44">
                <select
                  value={newCategory}
                  aria-label="카테고리 선택"
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              >
                <Plus className="h-4 w-4" />
                추가
              </button>
            </div>

            {keywordError && (
              <p className="mt-2 flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                <AlertCircle className="h-3.5 w-3.5" />
                {keywordError}
              </p>
            )}
          </form>

          {/* 2. 등록된 규칙 목록 및 검색 바 */}
          <div className="space-y-3">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  등록된 커스텀 규칙
                </h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {rules.length}개
                </span>
              </div>

              {rules.length > 3 && (
                <div className="relative sm:w-56">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    aria-label="분류 규칙 검색"
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="규칙 또는 카테고리 검색..."
                    className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-xs text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* 규칙 리스트 컨테이너 */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-800 dark:divide-slate-800">
              {rules.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    등록된 커스텀 가맹점 분류 규칙이 없습니다.
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    자주 이용하는 동네 상점, 프랜차이즈 키워드를 등록하면 파싱 정확도가 높아집니다.
                  </p>
                </div>
              ) : filteredRules.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 dark:text-slate-500">
                  검색 조건에 맞는 분류 규칙이 없습니다.
                </div>
              ) : (
                filteredRules.map((rule) => {
                  const isEditing = editingId === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className="flex flex-col gap-2 p-3 transition-colors hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/50"
                    >
                      {isEditing ? (
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-1 items-center gap-2">
                            <input
                              type="text"
                              value={editKeyword}
                              aria-label="수정할 가맹점 키워드"
                              onChange={(e) => setEditKeyword(e.target.value)}
                              className="flex-1 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            />
                            <select
                              value={editCategory}
                              aria-label="수정할 카테고리"
                              onChange={(e) => setEditCategory(e.target.value)}
                              className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-800 focus:border-indigo-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                            >
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(rule.id)}
                              aria-label="수정 완료"
                              className="rounded-md bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              aria-label="수정 취소"
                              className="rounded-md bg-slate-200 p-1.5 text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          {editError && (
                            <p className="text-[11px] text-rose-500">{editError}</p>
                          )}
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                              {rule.keyword}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600">→</span>
                            <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                              {getCategoryLabel(rule.category)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 self-end sm:self-auto">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(rule)}
                              aria-label={`${rule.keyword} 규칙 수정`}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRule(rule.id, rule.keyword)}
                              aria-label={`${rule.keyword} 규칙 삭제`}
                              className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 초기화 확인 바 */}
          {showResetConfirm && (
            <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
              <span className="font-medium">
                등록된 모든 커스텀 규칙이 영구 삭제됩니다. 계속하시겠습니까?
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmReset}
                  className="rounded-md bg-rose-600 px-3 py-1 font-bold text-white hover:bg-rose-700"
                >
                  초기화 실행
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 모달 푸터 영역 */}
        <div className="flex flex-col justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadBackup}
              disabled={rules.length === 0}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Download className="h-3.5 w-3.5" />
              규칙 백업
            </button>

            <button
              type="button"
              onClick={handleTriggerUpload}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <Upload className="h-3.5 w-3.5" />
              백업 불러오기
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              aria-label="가맹점 분류 규칙 백업 파일 업로드"
              onChange={handleFileChange}
              className="hidden"
            />

            {rules.length > 0 && !showResetConfirm && (
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
              >
                <RotateCcw className="h-3 w-3" />
                기본값 복원
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            닫기
          </button>
        </div>
      </dialog>
    </div>
  );
}
