import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DonutChart } from "@/components/charts/DonutChart";
import { StackedBarChart } from "@/components/charts/StackedBarChart";
import type { ChartDataItem } from "@/components/charts/chartTypes";

describe("DonutChart Component", () => {
  const sampleData: ChartDataItem[] = [
    { id: "cafe", label: "카페/디저트", value: 100000, color: "#F59E0B" },
    { id: "transport", label: "대중교통", value: 50000, color: "#3B82F6" },
    { id: "convenience", label: "편의점", value: 50000, color: "#10B981" },
  ];

  it("데이터가 비어있거나 총 지출이 0원일 때 빈 데이터 플레이스홀더를 렌더링해야 한다", () => {
    render(<DonutChart data={[{ id: "cafe", label: "카페", value: 0 }]} />);

    expect(screen.getByTestId("donut-chart-empty")).toBeInTheDocument();
    expect(screen.getByText("지출 금액을 입력해 주세요")).toBeInTheDocument();
  });

  it("지출 데이터가 있을 때 SVG 차트와 총액, 세그먼트 및 범례를 정상 렌더링해야 한다", () => {
    render(<DonutChart data={sampleData} title="지출 비중" />);

    expect(screen.getByRole("img", { name: /지출 비중: 총 200,000원, 3개 카테고리/i })).toBeInTheDocument();
    expect(screen.getByTestId("donut-segment-cafe")).toBeInTheDocument();
    expect(screen.getByTestId("donut-segment-transport")).toBeInTheDocument();
    expect(screen.getByTestId("donut-segment-convenience")).toBeInTheDocument();

    // 범례 렌더링 확인
    expect(screen.getByTestId("donut-legend-cafe")).toHaveTextContent("카페/디저트");
    expect(screen.getByTestId("donut-legend-cafe")).toHaveTextContent("50%");
  });

  it("마우스 호버 또는 키보드 포커스 시 중앙 서머리 정보가 해당 카테고리로 변경되어야 한다", () => {
    const onHoverMock = vi.fn();
    render(<DonutChart data={sampleData} onHoverItem={onHoverMock} />);

    const centerInfo = screen.getByTestId("donut-center-info");
    expect(centerInfo).toHaveTextContent("총 월 지출");
    expect(centerInfo).toHaveTextContent("200,000원");

    const cafeSegment = screen.getByTestId("donut-segment-cafe");
    fireEvent.mouseEnter(cafeSegment);

    expect(onHoverMock).toHaveBeenCalledWith("cafe");
    expect(centerInfo).toHaveTextContent("카페/디저트");
    expect(centerInfo).toHaveTextContent("50%");
    expect(centerInfo).toHaveTextContent("100,000원");

    fireEvent.mouseLeave(cafeSegment);
    expect(onHoverMock).toHaveBeenCalledWith(null);
    expect(centerInfo).toHaveTextContent("총 월 지출");
  });

  it("범례 항목 클릭 또는 호버 시 해당 세그먼트가 하이라이트되어야 한다", () => {
    render(<DonutChart data={sampleData} />);

    const cafeLegend = screen.getByTestId("donut-legend-cafe");
    fireEvent.click(cafeLegend);

    const centerInfo = screen.getByTestId("donut-center-info");
    expect(centerInfo).toHaveTextContent("카페/디저트");

    // 다시 클릭하면 토글 해제
    fireEvent.click(cafeLegend);
    expect(centerInfo).toHaveTextContent("총 월 지출");
  });

  it("단일 항목 100% 데이터일 때도 오류 없이 풀 원(full circle) 아크를 렌더링해야 한다", () => {
    const singleData: ChartDataItem[] = [{ id: "dining", label: "외식", value: 300000 }];
    render(<DonutChart data={singleData} />);

    const segment = screen.getByTestId("donut-segment-dining");
    expect(segment).toBeInTheDocument();
    expect(segment.getAttribute("d")).toContain("M ");
  });

  it("WAI-ARIA 스크린 리더용 숨김 대체 데이터 테이블을 렌더링해야 한다", () => {
    render(<DonutChart data={sampleData} title="카테고리별 지출 비중" />);

    const table = screen.getByTestId("donut-accessible-table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass("sr-only");
    expect(screen.getByText("카테고리별 지출 비중 - 총 200,000원")).toBeInTheDocument();
  });
});

describe("StackedBarChart Component", () => {
  const sampleCardBenefits: ChartDataItem[] = [
    { id: "card-1", label: "신한카드 Mr.Life", value: 35000, color: "#6366F1", sublabel: "편의점, 병원/약국" },
    { id: "card-2", label: "삼성카드 taptap O", value: 25000, color: "#8B5CF6", sublabel: "카페, 대중교통" },
  ];

  it("데이터가 비어있거나 총액이 0원일 때 빈 상태 메시지를 렌더링해야 한다", () => {
    render(<StackedBarChart data={[]} />);

    expect(screen.getByTestId("stacked-bar-chart-empty")).toBeInTheDocument();
    expect(screen.getByText("혜택 데이터가 없습니다.")).toBeInTheDocument();
  });

  it("카드별 혜택 기여도 데이터를 누적 바 세그먼트 및 범례로 렌더링해야 한다", () => {
    render(<StackedBarChart data={sampleCardBenefits} title="카드별 기여도" />);

    expect(screen.getByRole("img", { name: /카드별 기여도: 총 60,000원/i })).toBeInTheDocument();
    expect(screen.getByTestId("stacked-bar-segment-card-1")).toBeInTheDocument();
    expect(screen.getByTestId("stacked-bar-segment-card-2")).toBeInTheDocument();

    // 범례 및 비율 확인 (35000/60000 ≈ 58%, 25000/60000 ≈ 42%)
    expect(screen.getByTestId("stacked-bar-legend-card-1")).toHaveTextContent("신한카드 Mr.Life");
    expect(screen.getByTestId("stacked-bar-legend-card-1")).toHaveTextContent("58%");
    expect(screen.getByTestId("stacked-bar-legend-card-2")).toHaveTextContent("삼성카드 taptap O");
    expect(screen.getByTestId("stacked-bar-legend-card-2")).toHaveTextContent("42%");
  });

  it("세그먼트나 범례 항목 호버/포커스 시 상단에 활성화 뱃지가 표시되어야 한다", () => {
    const onHoverMock = vi.fn();
    render(<StackedBarChart data={sampleCardBenefits} onHoverItem={onHoverMock} />);

    const segment1 = screen.getByTestId("stacked-bar-segment-card-1");
    fireEvent.mouseEnter(segment1);

    expect(onHoverMock).toHaveBeenCalledWith("card-1");
    expect(screen.getByText("신한카드 Mr.Life 58%")).toBeInTheDocument();

    fireEvent.mouseLeave(segment1);
    expect(onHoverMock).toHaveBeenCalledWith(null);
  });

  it("WAI-ARIA 스크린 리더용 숨김 대체 데이터 테이블을 렌더링해야 한다", () => {
    render(<StackedBarChart data={sampleCardBenefits} title="카드별 월간 혜택 기여도" />);

    const table = screen.getByTestId("stacked-bar-accessible-table");
    expect(table).toBeInTheDocument();
    expect(table).toHaveClass("sr-only");
    expect(screen.getByText("카드별 월간 혜택 기여도 - 총 60,000원")).toBeInTheDocument();
  });
});
