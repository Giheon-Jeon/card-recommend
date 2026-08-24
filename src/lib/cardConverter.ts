import type { Card, Benefit, BenefitType, CategoryId } from "@/types/card";
import type { CatalogEntry } from "@/types/catalog";
import { KEYWORD_MAP } from "@/lib/importerParser";

/**
 * 카탈로그 카드 정보(CatalogEntry)를 혜택 계산기용 카드 객체(Card)로 변환합니다.
 * 혜택 요약 텍스트를 파싱하여 카테고리별 할인/적립률과 유형을 추정합니다.
 */
export function catalogEntryToCard(entry: CatalogEntry): Card {
  const benefits: Benefit[] = [];

  if (entry.benefitSummary) {
    // 쉼표 혹은 플러스 기호 단위로 혜택 구분 분석
    const clauses = entry.benefitSummary.split(/[,+]/);

    for (const clause of clauses) {
      let matchedCategory: CategoryId | null = null;

      // KEYWORD_MAP을 기반으로 매칭되는 카테고리 찾기
      for (const [catId, keywords] of Object.entries(KEYWORD_MAP)) {
        for (const keyword of keywords) {
          if (clause.toLowerCase().includes(keyword.toLowerCase())) {
            matchedCategory = catId;
            break;
          }
        }
        if (matchedCategory) break;
      }

      // 매칭되지 않았을 때 "모든/전/국내외 가맹점" 키워드가 있다면 etc로 설정
      if (!matchedCategory) {
        if (clause.includes("가맹점") || clause.includes("전국") || clause.includes("국내외") || clause.includes("모든")) {
          matchedCategory = "etc";
        }
      }

      if (matchedCategory) {
        // 퍼센트 할인/적립률 파싱 (예: 5%, 0.2~2.0%, 10%)
        const percentMatch = clause.match(/(\d+(?:\.\d+)?)\s*%/);
        let rate = 0;
        let type: BenefitType = "discount";

        if (percentMatch) {
          rate = parseFloat(percentMatch[1]) / 100;
        } else {
          // 리터당 할인 혹은 금액 정액 할인 파싱
          const wonMatch = clause.match(/(\d+)\s*원/);
          if (wonMatch) {
            if (clause.includes("/L") || clause.includes("L당")) {
              // 리터당 60원 할인은 1,500원/L 기준 대략 4%로 매핑
              rate = 0.04;
            } else {
              // 일반 정액 할인은 5% 기본값으로 간주
              rate = 0.05;
            }
          }
        }

        if (clause.includes("적립") || clause.includes("포인트")) {
          type = "point";
        } else if (clause.includes("캐시백")) {
          type = "cashback";
        }

        if (rate > 0) {
          const existing = benefits.find((b) => b.category === matchedCategory);
          if (existing) {
            // 동일 카테고리에 여러 혜택 정보가 있을 경우 가장 높은 할인율만 보존
            if (rate > existing.rate) {
              existing.rate = rate;
              existing.type = type;
            }
          } else {
            benefits.push({
              category: matchedCategory,
              type,
              rate,
              capPerMonth: 10000, // 기본 월 한도
              description: clause.trim(),
            });
          }
        }
      }
    }
  }

  // 매칭된 혜택이 전혀 없을 때 기본 baseline 혜택(0.7% 일반 할인) 부여
  if (benefits.length === 0) {
    benefits.push({
      category: "etc",
      type: "discount",
      rate: 0.007,
      capPerMonth: 5000,
      description: entry.benefitSummary || "기본 혜택",
    });
  }

  return {
    id: `catalog-${entry.sourceId}`,
    name: entry.name,
    issuer: entry.issuer,
    cardType: entry.category === "체크" ? "check" : "credit",
    annualFee: entry.annualFee || 0,
    excludedCategories: [],
    tiers: [
      {
        minSpend: 0, // 시뮬레이션에서 바로 보일 수 있도록 실적 기준을 0으로 설정
        benefits,
      },
    ],
  };
}
