import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import axe from "axe-core";
import { CardList } from "@/components/CardList";
import { CatalogCardTile } from "@/components/catalog/CatalogCardTile";
import { CardDetailModal } from "@/components/catalog/CardDetailModal";
import { ParsedItemsTable } from "@/components/ParsedItemsTable";
import { SpendingImporter } from "@/components/SpendingImporter";
import type { CatalogCardEntry } from "@/types/catalog";

// Axe 실행 헬퍼: 가상 DOM 환경(happy-dom)에서 지원되지 않는 색상 대비 등 제외한 표준 WCAG 검사
async function checkA11y(container: HTMLElement) {
  const results = await axe.run(container, {
    rules: {
      // happy-dom 가상 환경에서는 레이아웃 및 폰트 렌더링 엔진 부재로 color-contrast 검사 신뢰성이 낮으므로 제외
      "color-contrast": { enabled: false },
    },
  });
  return results.violations;
}

describe("Accessibility (a11y) Automated Tests with axe-core", () => {
  const dummyEntry: CatalogCardEntry = {
    id: 1,
    name: "신한카드 Mr.Life",
    issuer: "신한카드",
    category: "신용카드",
    annualFee: 15000,
    annualFeeText: "국내전용 15,000원",
    benefitSummary: "공과금 10% 할인, 마트 10% 할인",
    sourceUrl: "https://example.com/card/1",
  };

  const dummyCategories = [
    { id: "cafe", label: "카페/디저트", monthlySpend: 50000 },
    { id: "transport", label: "대중교통", monthlySpend: 70000 },
  ];

  const dummyEvaluation = {
    card: {
      id: "sh-mrlife",
      name: "신한카드 Mr.Life",
      cardType: "credit" as const,
      issuer: "신한카드",
      annualFee: 15000,
      tiers: [],
    },
    qualifyingSpend: 300000,
    meetsMinimum: true,
    tierIndex: 0,
    breakdown: [],
    totalMonthlyBenefit: 25000,
    netMonthlyBenefit: 23750,
  };

  it("CardList 컴포넌트는 WCAG 접근성 위반 사항이 없어야 한다", async () => {
    const { container } = render(
      <CardList
        evaluations={[dummyEvaluation]}
        cardTypes={["credit", "check"]}
        categories={dummyCategories}
        onToggleCardType={() => {}}
      />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("CatalogCardTile 컴포넌트는 WCAG 접근성 위반 사항이 없어야 한다", async () => {
    const { container } = render(
      <CatalogCardTile
        entry={dummyEntry}
        inMyCards={false}
        onSelect={() => {}}
        onToggleMyCards={() => {}}
      />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("CardDetailModal 컴포넌트는 WCAG 접근성 위반 사항이 없어야 한다", async () => {
    const { container } = render(
      <CardDetailModal entry={dummyEntry} onClose={() => {}} />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("ParsedItemsTable 컴포넌트는 WCAG 접근성 위반 사항이 없어야 한다", async () => {
    const { container } = render(
      <ParsedItemsTable
        items={[{ merchant: "스타벅스", amount: 10000, category: "cafe" }]}
        categories={dummyCategories}
        importMode="merge"
        onImportModeChange={() => {}}
        onUpdateItem={() => {}}
        onDeleteItem={() => {}}
        onApply={() => {}}
        onCancel={() => {}}
      />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });

  it("SpendingImporter 컴포넌트는 WCAG 접근성 위반 사항이 없어야 한다", async () => {
    const { container } = render(
      <SpendingImporter
        categories={dummyCategories}
        onImport={() => {}}
      />
    );
    const violations = await checkA11y(container);
    expect(violations).toEqual([]);
  });
});
