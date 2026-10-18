import { formatWon } from "@/lib/format";
import type { Category } from "@/types/card";
import type { CardEvaluation, CategoryWinner } from "@/types/recommendation";
import type { PortfolioRecommendation } from "@/types/portfolio";

export interface ShareFormatOptions {
  /** 사용자의 지출 세부 금액(카테고리별 지출액 등) 포함 여부 (기본값: false, 총액 및 혜택 위주 요약) */
  includeSpendDetails?: boolean;
}

export interface ShareResult {
  action: "share" | "clipboard";
  success: boolean;
  canceled?: boolean;
}

/**
 * 단일 1위 추천 카드 및 카테고리별 매칭 결과를 텍스트 요약으로 변환합니다.
 */
export function formatSingleRecommendationSummary(
  topCard: CardEvaluation,
  categoryWinners: CategoryWinner[],
  categories: Category[],
  options: ShareFormatOptions = {},
): string {
  const { includeSpendDetails = false } = options;
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  const cardTypeLabel = topCard.card.cardType === "credit" ? "신용카드" : "체크카드";
  const monthlyAnnualFee = Math.round(topCard.card.annualFee / 12);

  const lines: string[] = [
    "💳 [카드 혜택 추천 결과]",
    `🥇 1위 추천 카드: ${topCard.card.name} (${topCard.card.issuer} · ${cardTypeLabel})`,
    `• 월 순혜택 (연회비 차감): ${formatWon(topCard.netMonthlyBenefit)}`,
    `• 월 총 혜택: +${formatWon(topCard.totalMonthlyBenefit)}`,
    `• 연회비: ${formatWon(topCard.card.annualFee)} (월 환산 -${formatWon(monthlyAnnualFee)})`,
    `• 전월실적 인정금액: ${formatWon(topCard.qualifyingSpend)}`,
  ];

  const activeWinners = categoryWinners.filter((w) => w.bestCard);
  if (activeWinners.length > 0) {
    lines.push("");
    lines.push("📌 카테고리별 최적 카드");
    activeWinners.forEach((winner) => {
      const catName = categoryLabel(winner.category);
      const cardName = winner.bestCard?.name ?? "해당 없음";
      const benefitStr = `+${formatWon(winner.benefitAmount)}`;

      // 지출 세부액 포함 옵션 확인
      const breakdownItem = topCard.breakdown.find((b) => b.category === winner.category);
      if (includeSpendDetails && breakdownItem && breakdownItem.spend > 0) {
        lines.push(`• ${catName}: ${cardName} (${benefitStr} / 월 지출 ${formatWon(breakdownItem.spend)})`);
      } else {
        lines.push(`• ${catName}: ${cardName} (${benefitStr})`);
      }
    });
  }

  lines.push("");
  lines.push("✨ 카드 혜택 시뮬레이터에서 나만의 맞춤 소비 패턴을 분석해 보세요!");

  return lines.join("\n");
}

/**
 * 2~3장 최적 다중 카드 포트폴리오 결과를 텍스트 요약으로 변환합니다.
 */
export function formatPortfolioRecommendationSummary(
  portfolio: PortfolioRecommendation,
  categories: Category[],
  options: ShareFormatOptions = {},
): string {
  const { includeSpendDetails = false } = options;
  const categoryLabel = (id: string) => categories.find((c) => c.id === id)?.label ?? id;

  const monthlyAnnualFee = Math.round(portfolio.totalAnnualFee / 12);

  const lines: string[] = [
    `🎯 [AI 최적 카드 포트폴리오 (${portfolio.combinationSize}장 조합)]`,
    `✨ 월 순혜택: ${formatWon(portfolio.netMonthlyBenefit)}` +
      (portfolio.benefitIncreaseVsSingle > 0
        ? ` (단일 1위 대비 +${formatWon(portfolio.benefitIncreaseVsSingle)} 추가 이득)`
        : ""),
    `• 월 총 혜택: +${formatWon(portfolio.totalMonthlyBenefit)}`,
    `• 합산 연회비: ${formatWon(portfolio.totalAnnualFee)} (월 환산 -${formatWon(monthlyAnnualFee)})`,
  ];

  if (includeSpendDetails && portfolio.totalSpend > 0) {
    lines.push(`• 분석 월 지출 총액: ${formatWon(portfolio.totalSpend)}`);
  }

  lines.push("");
  lines.push(`💳 추천 조합 카드 (${portfolio.cards.length}장)`);
  portfolio.cardAllocations.forEach((alloc, idx) => {
    const percent =
      portfolio.totalMonthlyBenefit > 0
        ? Math.round((alloc.monthlyBenefit / portfolio.totalMonthlyBenefit) * 100)
        : 0;
    const spendInfo = includeSpendDetails ? `, 지출 배분 ${formatWon(alloc.allocatedSpend)}` : "";
    lines.push(
      `${idx + 1}. ${alloc.card.name} (${alloc.card.issuer}): 월 +${formatWon(alloc.monthlyBenefit)} (${percent}% 기여${spendInfo})`,
    );
  });

  if (portfolio.categoryAssignments.length > 0) {
    lines.push("");
    lines.push("📋 카테고리별 추천 결제 카드 배분표");
    portfolio.categoryAssignments.forEach((assign) => {
      const catName = categoryLabel(assign.category);
      const cardName = assign.assignedCard.name;
      const rateStr = `${(assign.rate * 100).toFixed(1)}%`;
      const benefitStr = `+${formatWon(assign.benefitAmount)}`;

      if (includeSpendDetails) {
        lines.push(
          `• ${catName}: ${cardName} (혜택률 ${rateStr}, 예상 혜택 ${benefitStr} / 월 지출 ${formatWon(assign.spend)})`,
        );
      } else {
        lines.push(`• ${catName}: ${cardName} (혜택률 ${rateStr}, 예상 혜택 ${benefitStr})`);
      }
    });
  }

  lines.push("");
  lines.push("✨ 카드 혜택 시뮬레이터에서 나만의 맞춤 소비 패턴을 분석해 보세요!");

  return lines.join("\n");
}

/**
 * 텍스트를 클립보드에 복사합니다.
 * navigator.clipboard가 없는 환경(구형 브라우저, 특정 iframe 등)에서는 execCommand fallback을 사용합니다.
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // navigator.clipboard 실패 시 textarea fallback 시도
  }

  if (typeof document !== "undefined") {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.top = "-9999px";
      textArea.style.left = "-9999px";
      textArea.setAttribute("aria-hidden", "true");
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand("copy");
      document.body.removeChild(textArea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Web Share API가 지원되는 모바일 환경에서는 공유 시트를 띄우고,
 * 미지원 브라우저이거나 PC 환경에서는 클립보드에 복사합니다.
 */
export async function shareOrCopyRecommendation(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  const canUseWebShare =
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    // 모바일 터치 장치이거나 canShare가 지원되는 경우
    (!("canShare" in navigator) || (navigator.canShare && navigator.canShare(data)));

  if (canUseWebShare) {
    try {
      await navigator.share(data);
      return { action: "share", success: true };
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        // 사용자가 공유 시트를 닫거나 취소한 경우
        return { action: "share", success: false, canceled: true };
      }
      // 공유 실패 시 클립보드 복사로 fallback 진행
    }
  }

  const copied = await copyTextToClipboard(data.text);
  return { action: "clipboard", success: copied };
}
