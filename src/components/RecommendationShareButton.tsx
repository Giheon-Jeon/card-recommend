import { useState, useRef, useEffect } from "react";
import { Share2, Copy, Check, ChevronDown, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import {
  shareOrCopyRecommendation,
  type ShareFormatOptions,
} from "@/lib/recommendationShare";

interface RecommendationShareButtonProps {
  /** 공유할 요약 텍스트를 생성하는 함수 (옵션에 따라 동적 생성) */
  onGenerateText: (options: ShareFormatOptions) => string;
  /** 공유 제목 */
  title: string;
  /** 버튼 크기 및 스타일 커스텀 */
  variant?: "primary" | "secondary";
  /** 버튼 라벨 */
  label?: string;
  /** 테스트 식별용 testid */
  testId?: string;
}

export function RecommendationShareButton({
  onGenerateText,
  title,
  variant = "secondary",
  label = "결과 공유",
  testId = "recommendation-share-btn",
}: RecommendationShareButtonProps) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [includeSpendDetails, setIncludeSpendDetails] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleShare = async (forcedAction?: "share" | "clipboard") => {
    const text = onGenerateText({ includeSpendDetails });

    if (forcedAction === "clipboard") {
      // 강제 클립보드 복사
      const { copyTextToClipboard } = await import("@/lib/recommendationShare");
      const ok = await copyTextToClipboard(text);
      if (ok) {
        setCopied(true);
        setLiveAnnouncement("추천 결과가 클립보드에 복사되었습니다.");
        toast.success("추천 결과가 클립보드에 복사되었습니다.");
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setCopied(false);
          setLiveAnnouncement("");
        }, 2000);
      } else {
        toast.error("클립보드 복사에 실패했습니다.");
      }
      setIsOpen(false);
      return;
    }

    // 기본 Web Share or 클립보드 복사
    const result = await shareOrCopyRecommendation({
      title,
      text,
    });

    if (result.canceled) {
      return;
    }

    if (result.success) {
      setCopied(true);
      const msg =
        result.action === "share"
          ? "추천 결과 공유창을 열었습니다."
          : "추천 결과가 클립보드에 복사되었습니다.";
      setLiveAnnouncement(msg);
      toast.success(msg);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setCopied(false);
        setLiveAnnouncement("");
      }, 2000);
    } else {
      toast.error("결과 공유에 실패했습니다.");
    }

    setIsOpen(false);
  };

  const isPrimary = variant === "primary";

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      {/* 스크린리더 공지용 live region */}
      <output className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </output>

      <div className="inline-flex rounded-xl shadow-xs">
        {/* 주 실행 버튼 */}
        <button
          type="button"
          data-testid={testId}
          onClick={() => handleShare()}
          aria-label={`${label}${includeSpendDetails ? " (세부 지출액 포함)" : " (요약)"}`}
          className={`inline-flex items-center gap-1.5 rounded-l-xl px-3 py-1.5 text-xs font-bold transition focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 ${
            isPrimary
              ? "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700"
              : "border border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          }`}
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
              <span className="text-emerald-600 dark:text-emerald-400">복사 완료!</span>
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
              <span>{label}</span>
            </>
          )}
        </button>

        {/* 상세 옵션 드롭다운 토글 버튼 */}
        <button
          type="button"
          data-testid={`${testId}-options`}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-label="공유 옵션 선택 및 세부 설정"
          className={`border-l px-1.5 py-1.5 rounded-r-xl text-xs font-bold transition focus:outline-hidden focus:ring-2 focus:ring-indigo-500/50 ${
            isPrimary
              ? "border-indigo-500/40 bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700"
              : "border-slate-200/90 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
          }`}
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </button>
      </div>

      {/* 공유 상세 옵션 드롭다운 팝오버 */}
      {isOpen && (
        <dialog
          open
          aria-label="공유 세부 옵션"
          className="absolute right-0 top-full mt-1.5 z-30 m-0 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900 transition-all text-left"
        >
          {/* 개인정보 보호 안내 및 세부 지출 토글 */}
          <div className="mb-2.5 rounded-xl border border-slate-100 bg-slate-50/80 p-2.5 dark:border-slate-800 dark:bg-slate-800/60">
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-xs font-bold">개인정보 보호 옵션</span>
            </div>
            <label className="mt-2 flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeSpendDetails}
                onChange={(e) => setIncludeSpendDetails(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
              />
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                카테고리별 세부 지출액 포함
              </span>
            </label>
            <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 leading-tight">
              체크 해제 시 소비 총액 및 지출액을 숨기고 혜택 금액 위주로 안전하게 요약됩니다.
            </p>
          </div>

          <div className="space-y-1">
            <button
              type="button"
              onClick={() => handleShare("clipboard")}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 transition"
            >
              <Copy className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>텍스트 클립보드에 복사</span>
            </button>

            <button
              type="button"
              onClick={() => handleShare()}
              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 transition"
            >
              <Share2 className="h-3.5 w-3.5 shrink-0" />
              <span>외부 앱으로 바로 공유 (SNS/메신저)</span>
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
