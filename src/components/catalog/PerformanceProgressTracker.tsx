import { useMemo } from "react";
import { formatWon } from "@/lib/format";
import {
  calculatePerformanceProgress,
  type PerformanceProgress,
} from "@/lib/performanceTracker";

interface PerformanceProgressTrackerProps {
  currentSpend: number;
  tiers: number[];
  cardName?: string;
  compact?: boolean;
}

export function PerformanceProgressTracker({
  currentSpend,
  tiers,
  cardName = "카드",
  compact = false,
}: PerformanceProgressTrackerProps) {
  const progress: PerformanceProgress = useMemo(() => {
    return calculatePerformanceProgress(currentSpend, tiers);
  }, [currentSpend, tiers]);

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

  return (
    <div
      data-testid="performance-progress-tracker"
      className="flex flex-col gap-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 p-3 border border-slate-100 dark:border-slate-800/80 text-xs"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            실적 달성 현황
          </span>
          <span
            data-testid="performance-status-badge"
            className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${badgeStyle}`}
          >
            {progress.statusLabel}
          </span>
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
