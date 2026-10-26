/* oxlint-disable jsx-a11y/prefer-tag-over-role */
import { useState, useId } from "react";
import type { ChartDataItem } from "./chartTypes";
import { DEFAULT_CHART_PALETTE } from "./chartTypes";
import { formatWon } from "@/lib/format";

interface DonutChartProps {
  data: ChartDataItem[];
  title?: string;
  size?: number;
  innerRadiusRatio?: number; // 0.0 ~ 1.0, 기본값 0.65
  showLegend?: boolean;
  activeId?: string | null;
  onHoverItem?: (id: string | null) => void;
  className?: string;
}

interface ArcSegment {
  item: ChartDataItem;
  pathData: string;
  highlightPathData: string;
  startAngle: number;
  endAngle: number;
  percentage: number;
  color: string;
}

/** 12시 방향(-PI/2) 기준 각도를 극좌표에서 직교좌표로 변환 */
function polarToCartesian(cx: number, cy: number, radius: number, angleInRadians: number) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

/** 도넛 차트 아크 패스(d) 생성 */
function createDonutArcPath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
): string {
  // 360도에 근접한 경우 (단일 세그먼트 100%)
  const isFullCircle = endAngle - startAngle >= 2 * Math.PI - 0.0001;

  if (isFullCircle) {
    const midAngle = startAngle + Math.PI;
    const outerP1 = polarToCartesian(cx, cy, outerR, startAngle);
    const outerP2 = polarToCartesian(cx, cy, outerR, midAngle);
    const innerP1 = polarToCartesian(cx, cy, innerR, startAngle);
    const innerP2 = polarToCartesian(cx, cy, innerR, midAngle);

    return [
      `M ${outerP1.x} ${outerP1.y}`,
      `A ${outerR} ${outerR} 0 0 1 ${outerP2.x} ${outerP2.y}`,
      `A ${outerR} ${outerR} 0 0 1 ${outerP1.x} ${outerP1.y}`,
      `M ${innerP1.x} ${innerP1.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${innerP2.x} ${innerP2.y}`,
      `A ${innerR} ${innerR} 0 0 0 ${innerP1.x} ${innerP1.y}`,
      "Z",
    ].join(" ");
  }

  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
  const outerStart = polarToCartesian(cx, cy, outerR, startAngle);
  const outerEnd = polarToCartesian(cx, cy, outerR, endAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerStart.x} ${innerStart.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerEnd.x} ${innerEnd.y}`,
    "Z",
  ].join(" ");
}

export function DonutChart({
  data,
  title = "카테고리별 지출 비중",
  size = 260,
  innerRadiusRatio = 0.65,
  showLegend = true,
  activeId: externalActiveId,
  onHoverItem,
  className = "",
}: DonutChartProps) {
  const [internalActiveId, setInternalActiveId] = useState<string | null>(null);
  const chartId = useId();

  const activeId = externalActiveId !== undefined ? externalActiveId : internalActiveId;

  const validItems = data.filter((item) => item.value > 0);
  const totalValue = validItems.reduce((sum, item) => sum + item.value, 0);

  const handleItemHover = (id: string | null) => {
    setInternalActiveId(id);
    onHoverItem?.(id);
  };

  const center = size / 2;
  const outerRadius = (size / 2) * 0.9;
  const innerRadius = outerRadius * innerRadiusRatio;
  const expandedOuterRadius = outerRadius + 5;

  // React compiler 친화적인 불변 reduce 계산
  const { segments } = validItems.reduce<{
    currentAngle: number;
    segments: ArcSegment[];
  }>(
    (acc, item, index) => {
      const fraction = totalValue > 0 ? item.value / totalValue : 0;
      const angleDelta = fraction * 2 * Math.PI;
      const startAngle = acc.currentAngle;
      const endAngle = acc.currentAngle + angleDelta;

      const color = item.color || DEFAULT_CHART_PALETTE[index % DEFAULT_CHART_PALETTE.length];
      const pathData = createDonutArcPath(center, center, innerRadius, outerRadius, startAngle, endAngle);
      const highlightPathData = createDonutArcPath(
        center,
        center,
        innerRadius - 2,
        expandedOuterRadius,
        startAngle,
        endAngle
      );

      acc.segments.push({
        item,
        pathData,
        highlightPathData,
        startAngle,
        endAngle,
        percentage: Math.round(fraction * 100),
        color,
      });

      acc.currentAngle = endAngle;
      return acc;
    },
    { currentAngle: -Math.PI / 2, segments: [] }
  );

  const activeSegment = segments.find((s) => s.item.id === activeId);

  return (
    <div
      data-testid="donut-chart-container"
      className={`flex flex-col items-center gap-5 rounded-2xl bg-white p-5 dark:bg-slate-900 transition-colors ${className}`}
    >
      <div className="flex w-full items-center justify-between">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          <span>{title}</span>
          {validItems.length > 0 && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {validItems.length}개 항목
            </span>
          )}
        </h4>
        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          합계 {formatWon(totalValue)}
        </span>
      </div>

      {totalValue === 0 ? (
        <div
          data-testid="donut-chart-empty"
          className="flex h-56 w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center dark:border-slate-800"
        >
          <div className="relative mb-3 flex items-center justify-center">
            <svg
              width="80"
              height="80"
              viewBox="0 0 80 80"
              className="text-slate-200 dark:text-slate-800"
              aria-hidden="true"
            >
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
              />
            </svg>
          </div>
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            지출 금액을 입력해 주세요
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            카테고리별 예상 지출을 입력하면 실시간 비중 도넛 차트가 렌더링됩니다.
          </p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 w-full">
          {/* SVG 도넛 차트 본체 */}
          <div className="relative flex items-center justify-center select-none">
            <svg
              id={chartId}
              width={size}
              height={size}
              viewBox={`0 0 ${size} ${size}`}
              role="img"
              aria-label={`${title}: 총 ${formatWon(totalValue)}, ${validItems.length}개 카테고리`}
              className="overflow-visible focus:outline-none"
            >
              <g>
                {segments.map((seg) => {
                  const isActive = activeId === seg.item.id;
                  const isDimmed = activeId !== null && !isActive;

                  return (
                    <path
                      key={seg.item.id}
                      data-testid={`donut-segment-${seg.item.id}`}
                      d={isActive ? seg.highlightPathData : seg.pathData}
                      fill={seg.color}
                      opacity={isDimmed ? 0.35 : 1}
                      stroke={isActive ? "#ffffff" : "transparent"}
                      strokeWidth={isActive ? 2 : 0}
                      role="graphics-symbol"
                      aria-label={`${seg.item.label}: ${formatWon(seg.item.value)} (${seg.percentage}%)`}
                      tabIndex={0}
                      className="cursor-pointer transition-all duration-200 hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400"
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

            {/* 도넛 중앙 텍스트 / 호버 인포 */}
            <div
              data-testid="donut-center-info"
              className="pointer-events-none absolute flex flex-col items-center justify-center text-center px-2"
              style={{
                width: innerRadius * 2,
                height: innerRadius * 2,
              }}
              aria-hidden="true"
            >
              {activeSegment ? (
                <>
                  <span
                    className="inline-block h-2 w-2 rounded-full mb-1"
                    style={{ backgroundColor: activeSegment.color }}
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 line-clamp-1">
                    {activeSegment.item.label}
                  </span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                    {activeSegment.percentage}%
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {formatWon(activeSegment.item.value)}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-400">
                    총 월 지출
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
                    {formatWon(totalValue)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-400">
                    {validItems.length}개 항목
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 범례 (Legend) */}
          {showLegend && (
            <div
              data-testid="donut-chart-legend"
              className="grid grid-cols-2 gap-2 sm:grid-cols-2 md:grid-cols-1 w-full max-w-xs text-xs"
            >
              {segments.map((seg) => {
                const isActive = activeId === seg.item.id;
                const isDimmed = activeId !== null && !isActive;

                return (
                  <button
                    key={seg.item.id}
                    type="button"
                    aria-label={`${seg.item.label} ${seg.percentage}% ${formatWon(seg.item.value)}`}
                    data-testid={`donut-legend-${seg.item.id}`}
                    onClick={() => handleItemHover(isActive ? null : seg.item.id)}
                    onMouseEnter={() => handleItemHover(seg.item.id)}
                    onMouseLeave={() => handleItemHover(null)}
                    onFocus={() => handleItemHover(seg.item.id)}
                    onBlur={() => handleItemHover(null)}
                    className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 transition text-left ${
                      isActive
                        ? "bg-slate-100 font-bold dark:bg-slate-800 shadow-sm"
                        : isDimmed
                        ? "opacity-40 hover:opacity-100"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full shadow-xs"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="truncate text-slate-700 dark:text-slate-200">
                        {seg.item.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-semibold text-slate-900 dark:text-slate-100">
                        {seg.percentage}%
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-400">
                        ({formatWon(seg.item.value)})
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 스크린 리더용 숨김 대체 데이터 테이블 (WAI-ARIA 접근성 준수) */}
      <table
        className="sr-only"
        data-testid="donut-accessible-table"
        aria-label={`${title} 상세 데이터 표`}
      >
        <caption>{title} - 총 {formatWon(totalValue)}</caption>
        <thead>
          <tr>
            <th scope="col">카테고리</th>
            <th scope="col">금액</th>
            <th scope="col">비중</th>
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
    </div>
  );
}
