import { describe, it, expect, beforeEach } from "vitest";
import {
  evaluateCard,
  clearBenefitCache,
  getBenefitCacheStats,
  serializeSpendingProfile,
  serializeCardCacheKey,
} from "@/lib/benefitCalculator";
import { rankCards } from "@/lib/recommender";
import type { Card, SpendingProfile } from "@/types/card";

const sampleCardA: Card = {
  id: "card-a",
  name: "알뜰 할인 카드",
  issuer: "신한",
  cardType: "credit",
  annualFee: 12000,
  tiers: [
    {
      minSpend: 300000,
      benefits: [
        { category: "grocery", type: "discount", rate: 0.1, capPerMonth: 10000 },
        { category: "dining", type: "discount", rate: 0.05, capPerMonth: 5000 },
      ],
    },
  ],
};

const sampleCardB: Card = {
  id: "card-b",
  name: "포인트 적립 카드",
  issuer: "KB국민",
  cardType: "check",
  annualFee: 0,
  tiers: [
    {
      minSpend: 0,
      benefits: [{ category: "transit", type: "point", rate: 0.05, capPerMonth: 5000 }],
    },
  ],
};

const tiered: Card = {
  id: "tiered",
  name: "구간별 혜택 카드",
  issuer: "테스트",
  cardType: "credit",
  annualFee: 0,
  tiers: [
    { minSpend: 300000, benefits: [{ category: "cafe", type: "discount", rate: 0.05 }] },
    { minSpend: 700000, benefits: [{ category: "cafe", type: "discount", rate: 0.2 }] },
  ],
};

describe("benefitCalculator - cache & serialization", () => {
  beforeEach(() => {
    clearBenefitCache();
  });

  it("지출 프로필을 순서에 무관하게 일관된 문자열 키로 직렬화해야 한다", () => {
    const profile1: SpendingProfile = { grocery: 100000, dining: 50000 };
    const profile2: SpendingProfile = { dining: 50000, grocery: 100000 };
    expect(serializeSpendingProfile(profile1)).toBe(serializeSpendingProfile(profile2));
    expect(serializeSpendingProfile(profile1)).toBe("dining:50000;grocery:100000;");
  });

  it("0원, 음수, NaN인 항목은 직렬화 키에서 제외하여 동일 캐시 키를 생성해야 한다", () => {
    const profile1: SpendingProfile = { grocery: 100000 };
    const profile2: SpendingProfile = { grocery: 100000, dining: 0, etc: -50000, cafe: Number.NaN };
    expect(serializeSpendingProfile(profile1)).toBe(serializeSpendingProfile(profile2));
  });

  it("동일 카드 및 지출 프로필에 대해 2회차 호출 시 캐시에서 히트되어야 한다", () => {
    const spending: SpendingProfile = { grocery: 400000, dining: 100000 };

    const firstEval = evaluateCard(sampleCardA, spending);
    let stats = getBenefitCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(0);
    expect(stats.size).toBe(1);

    const secondEval = evaluateCard(sampleCardA, spending);
    stats = getBenefitCacheStats();
    expect(stats.misses).toBe(1);
    expect(stats.hits).toBe(1);
    expect(secondEval).toEqual(firstEval);
  });

  it("지출 프로필이 달라지면 새로운 캐시 항목으로 계산되어야 한다", () => {
    const spending1: SpendingProfile = { grocery: 300000 };
    const spending2: SpendingProfile = { grocery: 500000 };

    evaluateCard(sampleCardA, spending1);
    evaluateCard(sampleCardA, spending2);

    const stats = getBenefitCacheStats();
    expect(stats.misses).toBe(2);
    expect(stats.hits).toBe(0);
    expect(stats.size).toBe(2);
  });

  it("clearBenefitCache 호출 시 캐시와 통계가 리셋되어야 한다", () => {
    const spending: SpendingProfile = { grocery: 300000 };
    evaluateCard(sampleCardA, spending);
    expect(getBenefitCacheStats().size).toBe(1);

    clearBenefitCache();
    const stats = getBenefitCacheStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it("rankCards 실행 시 반복 호출 간 캐시가 누적 활용되어야 한다", () => {
    const spending: SpendingProfile = { grocery: 500000, transit: 100000 };
    const cards = [sampleCardA, sampleCardB];

    // 1차 랭킹 계산
    const ranked1 = rankCards(cards, spending);
    expect(ranked1).toHaveLength(2);
    expect(getBenefitCacheStats().misses).toBe(2);
    expect(getBenefitCacheStats().hits).toBe(0);

    // 2차 랭킹 계산 (동일 지출) -> 2개 카드 모두 캐시 히트
    const ranked2 = rankCards(cards, spending);
    expect(ranked2).toHaveLength(2);
    expect(getBenefitCacheStats().hits).toBe(2);
  });

  it("캐시 결과는 캐시 미사용 결과와 같아야 한다", () => {
    clearBenefitCache();
    evaluateCard(tiered, { cafe: 400000 });
    const cached = evaluateCard(tiered, { cafe: 400000, etc: -200000 });
    const fresh = evaluateCard(tiered, { cafe: 400000, etc: -200000 }, false);
    expect(cached.qualifyingSpend).toBe(fresh.qualifyingSpend);
    expect(cached.meetsMinimum).toBe(fresh.meetsMinimum);
    expect(cached.totalMonthlyBenefit).toBe(fresh.totalMonthlyBenefit);
    expect(cached.netMonthlyBenefit).toBe(fresh.netMonthlyBenefit);
  });

  it("동일한 ID의 카드라도 연회비나 혜택 조건이 변경되면 이전 캐시가 무효화되고 새 값으로 계산된다", () => {
    clearBenefitCache();
    const initialEval = evaluateCard(tiered, { cafe: 400000 });
    expect(initialEval.totalMonthlyBenefit).toBe(20000);
    expect(initialEval.netMonthlyBenefit).toBe(20000);

    // 동일 ID("tiered")에서 연회비를 0 -> 120,000원(월 10,000원)으로 변경
    const feeChangedCard: Card = {
      ...tiered,
      annualFee: 120000,
    };
    expect(serializeCardCacheKey(feeChangedCard)).not.toBe(serializeCardCacheKey(tiered));

    const feeChangedEval = evaluateCard(feeChangedCard, { cafe: 400000 });
    expect(feeChangedEval.totalMonthlyBenefit).toBe(20000);
    expect(feeChangedEval.netMonthlyBenefit).toBe(10000);

    // 동일 ID("tiered")에서 혜택률을 5% -> 10%로 변경
    const rateChangedCard: Card = {
      ...tiered,
      tiers: [
        { minSpend: 300000, benefits: [{ category: "cafe", type: "discount", rate: 0.1 }] },
      ],
    };
    const rateChangedEval = evaluateCard(rateChangedCard, { cafe: 400000 });
    expect(rateChangedEval.totalMonthlyBenefit).toBe(40000);
  });
});
