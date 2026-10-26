/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useState, useId } from "react";
import type { ChartDataItem } from "./chartTypes";
import { DEFAULT_CHART_PALETTE } from "./chartTypes";
import { formatWon } from "@/lib/format";

interface StackedBarChartProps {
  data: ChartDataItem[];
  title?: string;
  height?: number;
  showLegend?: boolean;
  activeId?: string | null;
  onHoverItem?: (id: string | null) => void;
  className?: string;
}

interface BarSegment {
  item: ChartDataItem;
  color: string;
  fraction: number;
  percentage: number;
  startPercent: number;
  widthPercent: number;
}

export function StackedBarChart({
  data,
  title = "카드별 월간 혜택 기여도",
  height = 24,
  showLegend = true,
  activeId: externalActiveId,
  onHoverItem,
  className = "",
}: StackedBarChartProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const chartId = useId();

  const activeId = externalActiveId !== undefined ? externalActiveId : internalActiveId;

  const validItems = data.filter((item) => item.value > 0);
  const totalValue = validItems.reduce((sum, item) => sum + item.value, 0);

  const handleItemHover = (id: string | null) => {
    setInternalActiveId(id);
    onHoverItem?.(id);
  };

  // React compiler 친화적인 불변 reduce 계산
  const { segments } = validItems.reduce<{
    cumulativePercent: number;
    segments: BarSegment[];
  }>(
    (acc, item, index) => {
      const fraction = totalValue > 0 ? item.value / totalValue : 0;
      const percentage = Math.round(fraction * 100);
      const startPercent = acc.cumulativePercent;
      const widthPercent = fraction * 100;

      const color = item.color || DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length];

      acc.segments.push({
        item,
        color,
        fraction,
        percentage,
        startPercent,
        widthPercent,
      });

      acc.cumulativePercent += widthPercent;
      return acc;
    },
    { cumulativePercent: 0, segments: [] }
  );

  const activeSegment = segments.find((s) => s.item.id === activeId);

  return (
    <div
      data-testid="stacked-bar-chart-container"
      className={`flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 transition-colors ${className}`}
    >
      <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-1.5 font-bold">
          <span>{title}</span>
          {activeSegment && (
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {activeSegment.item.label} {activeSegment.percentage}%
            </span>
          )}
        </span>
        <span className="font-bold text-indigo-600 dark:text-indigo-400">
          합계 {formatWon(totalValue)}
        </span>
      </div>

      {totalValue === 0 ? (
        <div
          data-testid="stacked-bar-chart-empty"
          className="flex h-12 w-full items-center justify-center rounded-lg border border-dashed border-slate-200 text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500"
        >
          혜택 데이터가 없습니다.
        </div>
      ) : (
        <>
          {/* 순수 SVG 스택 바 */}
          <div className="relative w-full">
            <svg
              id={chartId}
              width="100%"
              height={height}
              viewBox={`0 0 1000 ${height}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={`${title}: 총 ${formatWon(totalValue)}`}
              className="w-full overflow-hidden rounded-full shadow-inner focus:outline-none"
            >
              <defs>
                <clipPath id={`${chartId}-clip`}>
                  <rect x="0" y="0" width="1000" height={height} rx={height / 2} ry={height / 2} />
                </clipPath>
              </defs>

              <g clipPath={`url(#${chartId}-clip)`}>
                {segments.map((seg) => {
                  const x = (seg.startPercent / 100) * 1000;
                  const width = (seg.widthPercent / 100) * 1000;
                  const isActive = activeId === seg.item.id;
                  const isDimmed = activeId !== null && !isActive;

                  return (
                    <rect
                      key={seg.item.id}
                      data-testid={`stacked-bar-segment-${seg.item.id}`}
                      x={x}
                      y={0}
                      width={Math.max(width, 2)}
                      height={height}
                      fill={seg.color}
                      opacity={isDimmed ? 0.35 : 1}
                      role="graphics-symbol"
                      aria-label={`${seg.item.label}: ${formatWon(seg.item.value)} (${seg.percentage}%)`}
                      tabIndex={0}
                      className="cursor-pointer transition-all duration-200 hover:brightness-110 focus:outline-none"
                      onMouseEnter={() => handleItemHover(seg.item.id)}
                      onMouseLeave={() => handleItemHover(null)}
                      onFocus={() => handleItemHover(seg.item.id)}
                      onBlur={() => handleItemHover(null)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleItemHover(activeId === seg.item.id ? null : seg.item.id);
                        }
                      }}
                    />
                  );
                })}
              </g>
            </svg>
          </div>

          {/* 범례 및 카드별 세부 요약 */}
          {showLegend && (
            <div
              data-testid="stacked-bar-legend"
              className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2 lg:grid-cols-3"
            >
              {segments.map((seg) => {
                const isActive = activeId === seg.item.id;
                const isDimmed = activeId !== null && !isActive;

                return (
                  <button
                    key={seg.item.id}
                    type="button"
                    aria-label={`${seg.item.label} ${seg.percentage}% ${formatWon(seg.item.value)}`}
                    data-testid={`stacked-bar-legend-${seg.item.id}`}
                    onClick={() => handleItemHover(isActive ? null : seg.item.id)}
                    onMouseEnter={() => handleItemHover(seg.item.id)}
                    onMouseLeave={() => handleItemHover(null)}
                    onFocus={() => handleItemHover(seg.item.id)}
                    onBlur={() => handleItemHover(null)}
                    className={`flex items-center justify-between rounded-lg border p-2 text-left transition ${
                      isActive
                        ? "border-indigo-400 bg-white shadow-xs dark:border-indigo-500 dark:bg-slate-800"
                        : isDimmed
                        ? "border-transparent opacity-45 hover:opacity-100"
                        : "border-slate-200/60 bg-white/70 hover:border-slate-300 dark:border-slate-700/60 dark:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: seg.color }}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                          {seg.item.label}
                        </p>
                        {seg.item.sublabel && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-400 truncate">
                            {seg.item.sublabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                        {seg.percentage}%
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {formatWon(seg.item.value)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* 스크린 리더용 숨김 데이터 테이블 */}
          <table
            className="sr-only"
            data-testid="stacked-bar-accessible-table"
            aria-label={`${title} 상세 데이터 표`}
          >
            <caption>{title} - 총 {formatWon(totalValue)}</caption>
            <thead>
              <tr>
                <th scope="col">항목</th>
                <th scope="col">혜택/지출액</th>
                <th scope="col">기여 비중</th>
              </tr>
            </thead>
            <tbody>
              {segments.map((seg) => (
                <tr key={seg.item.id}>
                  <td>{seg.item.label}</td>
                  <td>{seg.item.value}원</td>
                  <td>{seg.percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
