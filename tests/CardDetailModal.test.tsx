import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";
import type { CatalogEntry } from "@/types/catalog";

const sampleCreditCard: CatalogEntry = {
  sourceId: 101,
  sourceUrl: "https://example.com/card/101",
  name: "신한카드 Mr.Life",
  issuer: "신한카드",
  category: "신용",
  annualFee: 15000,
  annualFeeText: "국내전용 15,000원 / 해외겸용 18,000원",
  benefitSummary: "공과금 10% 할인, 편의점 10% 할인, 병원/약국 10% 할인",
  performanceStandard: "전월 30만원 이상",
  fetchedAt: "2026-03-01",
};

const sampleCheckCard: CatalogEntry = {
  sourceId: 102,
  sourceUrl: "https://example.com/card/102",
  name: "KB국민 노리2 체크카드",
  issuer: "KB국민카드",
  category: "체크",
  annualFee: 0,
  benefitSummary: "스타벅스 10% 할인, 편의점 5% 할인, 이동통신 2,500원 환급",
  performanceStandard: "전월 20만원 이상",
  fetchedAt: "2026-03-01",
};

describe("CardDetailModal Component", () => {
  it("신용카드에 대해 연간 예상 순혜택 및 연회비 회수 시점 뱃지가 올바르게 렌더링되어야 한다", () => {
    render(
      <CardDetailModal
        entry={sampleCreditCard}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "연간 순혜택 및 연회비 회수 분기점 지표" })).toBeInTheDocument();
    expect(screen.getByText("실질 가치 & 손익분기점 분석")).toBeInTheDocument();
    expect(screen.getByText("연간 예상 순혜택")).toBeInTheDocument();
    expect(screen.getByText("연회비 회수 시점")).toBeInTheDocument();
  });

  it("체크카드(연회비 0원)일 때 '연회비 없음 (즉시 혜택)' 뱃지가 표시되어야 한다", () => {
    render(
      <CardDetailModal
        entry={sampleCheckCard}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("연회비 없음 (즉시 혜택)")).toBeInTheDocument();
    expect(screen.getByText("첫 달부터 순수 혜택")).toBeInTheDocument();
    expect(screen.getByText("연회비 없음 (100% 순혜택)")).toBeInTheDocument();
  });

  it("monthlyBenefit prop이 주어지면 해당 수치를 기준으로 손익분기점을 계산한다", () => {
    // 연회비 15,000원, 월 혜택 30,000원 -> 당월 회수 (0.5개월), 연간 순혜택: 30,000*12 - 15,000 = 345,000원
    render(
      <CardDetailModal
        entry={sampleCreditCard}
        onClose={vi.fn()}
        monthlyBenefit={30000}
      />
    );

    expect(screen.getByText("당월 회수")).toBeInTheDocument();
    expect(screen.getByText("345,000원")).toBeInTheDocument();
    expect(screen.getByText(/월 예상 혜택: 30,000원 기준/)).toBeInTheDocument();
  });

  it("카드 상세 모달 내에 실적 및 혜택 제외 주의 항목 섹션과 뱃지들이 올바르게 렌더링되어야 한다", () => {
    render(
      <CardDetailModal
        entry={sampleCreditCard}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByRole("region", { name: "실적 및 혜택 제외 항목 안내" })).toBeInTheDocument();
    expect(screen.getByText("실적 산정 및 혜택 제외 주의 항목")).toBeInTheDocument();
    // 공과금 키워드로 감지된 세금·공과금 뱃지
    expect(screen.getByTestId("exclusion-badge-tax")).toBeInTheDocument();
    // 기본 표준 제외 항목인 아파트관리비 및 상품권 뱃지
    expect(screen.getByTestId("exclusion-badge-apartment")).toBeInTheDocument();
    expect(screen.getByTestId("exclusion-badge-voucher")).toBeInTheDocument();
  });

  it("상품권, 관리비 등 제외 키워드가 명시된 카드는 '카드 상품 명시 조건'으로 표기되어야 한다", () => {
    const cardWithExclusions: CatalogEntry = {
      ...sampleCheckCard,
      benefitSummary: "편의점 10% 할인 (상품권, 아파트관리비 제외)",
    };

    render(
      <CardDetailModal
        entry={cardWithExclusions}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText("카드 상품 명시 조건")).toBeInTheDocument();
    expect(screen.getByTestId("exclusion-badge-voucher")).toBeInTheDocument();
    expect(screen.getByTestId("exclusion-badge-apartment")).toBeInTheDocument();
  });
});
