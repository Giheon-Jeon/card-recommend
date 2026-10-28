import { useMemo } from "react";
import { formatWon } from "@/lib/format";
import {
  calculatePerformanceProgress,
  type PerformanceProgress,
} from "@/lib/performanceTracker";
import {
  getPerformanceDdayInfo,
  type PerformanceDdayInfo,
} from "@/lib/performanceDday";
import type { Card } from "@/types/card";
import type { CatalogEntry } from "@/types/catalog";

interface PerformanceProgressTrackerProps {
  currentSpend: number;
  tiers: number[];
  cardName?: string;
  compact?: boolean;
  /** 해당 카드의 CatalogEntry 또는 Card 정보 (소비 추천 팁 산출용) */
  card?: Card | CatalogEntry;
  /** D-Day 산출 기준 일자 (테스트 및 모의 확인용) */
  currentDate?: Date | string | number;
  /** D-Day 및 부족 실적 소비 가이드 표시 여부 (기본값 true) */
  showDdayGuide?: boolean;
}

export function PerformanceProgressTracker({
  currentSpend,
  tiers,
  cardName = "카드",
  compact = false,
  card,
  currentDate,
  showDdayGuide = true,
}: PerformanceProgressTrackerProps) {
  const progress: PerformanceProgress = useMemo(() => {
    return calculatePerformanceProgress(currentSpend, tiers);
  }, [currentSpend, tiers]);

  // 마감 D-Day 및 소비 추천 정보 산출
  const ddayInfo: PerformanceDdayInfo = useMemo(() => {
    return getPerformanceDdayInfo(
      progress.remainingToNextTier,
      card,
      currentDate,
    );
  }, [progress.remainingToNextTier, card, currentDate]);

  // 상태별 뱃지 스타일 및 진행바 색상 매핑
  const badgeStyle = useMemo(() => {
    switch (progress.status) {
      case "max":
        return "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
      case "met":
        return "bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
      case "unmet":
        return "bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800";
      case "none":
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700";
    }
  }, [progress.status]);

  const barColor = useMemo(() => {
    switch (progress.status) {
      case "max":
        return "bg-gradient-to-r from-indigo-500 to-violet-600";
      case "met":
        return "bg-gradient-to-r from-emerald-500 to-teal-500";
      case "unmet":
        return "bg-gradient-to-r from-amber-400 to-amber-500";
      case "none":
      default:
        return "bg-slate-400 dark:bg-slate-600";
    }
  }, [progress.status]);

  const helperText = useMemo(() => {
    if (progress.status === "none") {
      return "전월 실적 조건 없이 혜택 제공";
    }
    if (progress.status === "max") {
      return "최고 혜택 구간 달성 완료 🎉";
    }
    if (progress.status === "met") {
      return `다음 혜택 구간까지 ${formatWon(progress.remainingToNextTier)} 남음`;
    }
    return `최소 실적까지 ${formatWon(progress.remainingToNextTier)} 남음`;
  }, [progress.status, progress.remainingToNextTier]);

  // 실적 조건이 존재하고 다음 실적 구간까지 남은 금액이 있을 때 D-Day 가이드 활성화
  const hasRemainingSpend =
    progress.status !== "none" &&
    progress.status !== "max" &&
    progress.remainingToNextTier > 0;

  return (
    <div
      data-testid="performance-progress-tracker"
      className="flex flex-col gap-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800/80 text-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            실적 달성 현황
          </span>
          <span
            data-testid="performance-status-badge"
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
          >
            {progress.statusLabel}
          </span>

          {/* D-Day 카운트다운 뱃지: 실적 채우기가 필요한 경우 표시 */}
          {hasRemainingSpend && (
            <span
              data-testid="performance-dday-badge"
              className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                ddayInfo.isMonthEndUrgent
                  ? "bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 animate-pulse"
                  : "bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
              }`}
            >
              {ddayInfo.dDayLabel}
            </span>
          )}
        </div>
        <div className="text-right">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {formatWon(progress.currentSpend)}
          </span>
          {progress.tiers.length > 0 && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {" "}
              / {formatWon(progress.tiers[progress.tiers.length - 1])}
            </span>
          )}
        </div>
      </div>

      {/* 시맨틱 progress 태그 및 WAI-ARIA 규격 준수 프로그레스 바 */}
      <div className="relative">
        <progress
          aria-label={`${cardName} 전월 실적 달성률`}
          aria-valuenow={progress.progressPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={
            progress.status === "none"
              ? "실적 조건 없음"
              : `${progress.statusLabel}, 달성률 ${progress.progressPercent}%`
          }
          value={progress.progressPercent}
          max={100}
          className="sr-only"
        >
          {progress.progressPercent}%
        </progress>

        <div
          aria-hidden="true"
          className="relative h-2 w-full overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-700/80"
        >
          <div
            data-testid="performance-progress-fill"
            className={`h-full transition-all duration-300 ease-out rounded-full ${barColor}`}
            style={{ width: `${progress.progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span
          data-testid="performance-helper-text"
          className={`font-medium ${
            progress.status === "max"
              ? "text-indigo-600 dark:text-indigo-400 font-semibold"
              : progress.status === "unmet"
                ? "text-amber-600 dark:text-amber-400"
                : "text-slate-600 dark:text-slate-400"
          }`}
        >
          {helperText}
        </span>
        <span className="font-bold text-slate-700 dark:text-slate-300">
          {progress.status === "none" ? "100%" : `${progress.progressPercent}%`}
        </span>
      </div>

      {/* 당월 잔여 일수 기준 일평균 권장 소비액 하이라이트 */}
      {!compact && showDdayGuide && hasRemainingSpend && (
        <div
          data-testid="performance-daily-spend-highlight"
          className="flex items-center justify-between rounded-lg bg-amber-500/10 dark:bg-amber-500/15 px-2.5 py-1.5 text-[11px] text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/40"
        >
          <span className="font-medium text-amber-800 dark:text-amber-300">
            {ddayInfo.dDay === 0
              ? "말일 오늘 마감"
              : `마감까지 ${ddayInfo.daysRemaining}일간 일평균`}
          </span>
          <span className="font-bold text-amber-900 dark:text-amber-100">
            약 {formatWon(ddayInfo.dailyRecommendedSpend)} 소비 권장
          </span>
        </div>
      )}

      {/* 실적 채우기 최고 혜택 카테고리 소비 추천 팁 가이드 */}
      {!compact && showDdayGuide && hasRemainingSpend && ddayInfo.recommendedTip && (
        <div
          data-testid="spending-recommendation-tip"
          className="flex items-start gap-1.5 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 p-2 border border-indigo-100 dark:border-indigo-900/40 text-[11px] leading-relaxed text-indigo-950 dark:text-indigo-200"
        >
          <span
            className="text-indigo-600 dark:text-indigo-400 shrink-0 text-xs select-none"
            aria-hidden="true"
          >
            💡
          </span>
          <div className="flex-1">
            <span className="font-semibold text-indigo-700 dark:text-indigo-300">
              실적 채우기 팁:{" "}
            </span>
            <span>{ddayInfo.recommendedTip.tipMessage}</span>
          </div>
        </div>
      )}

      {/* 구간별 기준 체크포인트 안내 (compact 모드가 아니고 구간이 있는 경우 표시) */}
      {!compact && progress.tiers.length > 0 && (
        <div className="mt-0.5 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60 pt-1.5 text-[10px] text-slate-400 dark:text-slate-500">
          {progress.tiers.map((tier, idx) => {
            const isReached = progress.currentSpend >= tier;
            return (
              <span
                key={tier}
                className={`flex items-center gap-1 ${
                  isReached
                    ? "font-semibold text-emerald-600 dark:text-emerald-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span>{isReached ? "✓" : "○"}</span>
                <span>
                  {idx + 1}구간 {formatWon(tier)}
                </span>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
