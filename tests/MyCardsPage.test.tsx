import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MyCardsPage } from "@/components/catalog/MyCardsPage";
import { ToastProvider } from "@/contexts/ToastContext";
import * as myCardsModule from "@/lib/myCards";

describe("MyCardsPage Component", () => {
  const mockMyCards = {
    ids: [1, 2],
    add: vi.fn(),
    remove: vi.fn(),
    toggle: vi.fn(),
    has: vi.fn((id: number) => id === 1 || id === 2),
    importIds: vi.fn((_ids: number[], _mode?: "merge" | "overwrite") => 2),
    clear: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("카드가 없을 때 빈 화면과 불러오기 버튼이 렌더링되어야 한다", () => {
    const emptyMyCards = {
      ...mockMyCards,
      ids: [],
      has: vi.fn(() => false),
    };

    render(
      <ToastProvider>
        <MyCardsPage myCards={emptyMyCards} />
      </ToastProvider>
    );

    expect(screen.getByText("아직 담아둔 카드가 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /백업 파일 불러오기/ })).toBeInTheDocument();
  });

  it("카드가 있을 때 카드 목록과 상단 백업/불러오기 버튼이 렌더링되어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    expect(screen.getByRole("heading", { name: "내 카드" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /백업 다운로드/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /불러오기/ })).toBeInTheDocument();
  });

  it("백업 다운로드 버튼 클릭 시 downloadMyCardsBackup이 호출되어야 한다", () => {
    const spyDownload = vi.spyOn(myCardsModule, "downloadMyCardsBackup").mockImplementation(() => {});

    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const downloadBtn = screen.getByRole("button", { name: /백업 다운로드/ });
    fireEvent.click(downloadBtn);

    expect(spyDownload).toHaveBeenCalledWith(mockMyCards.ids);
    expect(screen.getByRole("status")).toHaveTextContent("내 카드 목록 백업 파일이 다운로드되었습니다.");
  });

  it("유효한 JSON 파일 업로드 시 importIds가 호출되고 성공 토스트가 표시되어야 한다", async () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const fileInput = screen.getByTestId("my-cards-file-input") as HTMLInputElement;
    const validJson = JSON.stringify({
      version: 1,
      exportedAt: "2026-09-11T00:00:00.000Z",
      cardCount: 2,
      cardIds: [10, 20],
    });

    const file = new File([validJson], "backup.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockMyCards.importIds).toHaveBeenCalledWith([10, 20], "merge");
      const status = screen.getByRole("status");
      expect(status).toHaveTextContent("성공적으로 불러왔습니다");
    });
  });

  it("잘못된 JSON 파일 업로드 시 스키마 검증 실패 및 에러 토스트가 표시되어야 한다", async () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const fileInput = screen.getByTestId("my-cards-file-input") as HTMLInputElement;
    const invalidJson = JSON.stringify({ wrongField: "notValid" });

    const file = new File([invalidJson], "broken.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockMyCards.importIds).not.toHaveBeenCalled();
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("일치하지 않는 형식");
    });
  });

  it("카드사별 통계 그리드가 정상적으로 렌더링되어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const statsGrid = screen.getByTestId("issuer-stats-grid");
    expect(statsGrid).toBeInTheDocument();
    expect(screen.getByText("카드사별 보유 현황")).toBeInTheDocument();
    // mockMyCards.ids [1, 2]는 둘 다 신한카드이므로 2장 표시
    expect(screen.getAllByText("신한카드").length).toBeGreaterThan(0);
  });

  it("전체 비우기 버튼 클릭 시 confirm 확인 시 clear가 호출되고 안내 토스트가 표시되어야 한다", () => {
    window.confirm = vi.fn().mockReturnValue(true);

    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const clearBtn = screen.getByRole("button", { name: /전체 비우기/ });
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalledWith("담아둔 모든 카드를 삭제하시겠습니까?");
    expect(mockMyCards.clear).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent("담아둔 모든 카드를 삭제했습니다.");
  });

  it("전체 비우기 버튼 클릭 시 confirm 취소 시 clear가 호출되지 않아야 한다", () => {
    window.confirm = vi.fn().mockReturnValue(false);

    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const clearBtn = screen.getByRole("button", { name: /전체 비우기/ });
    fireEvent.click(clearBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(mockMyCards.clear).not.toHaveBeenCalled();
  });

  it("상단 불러오기 버튼 클릭 시 복원 모드 선택 모달이 열리고 취소 버튼으로 닫을 수 있어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const openModalBtn = screen.getByRole("button", { name: /불러오기/ });
    fireEvent.click(openModalBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("내 카드 불러오기 방식 선택")).toBeInTheDocument();
    const mergeRadio = screen.getByDisplayValue("merge");
    expect(mergeRadio).toBeChecked();

    const cancelBtn = screen.getByRole("button", { name: "취소" });
    fireEvent.click(cancelBtn);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("불러오기 모달에서 덮어쓰기 모드 선택 후 파일 업로드 시 overwrite로 importIds가 호출되어야 한다", async () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const openModalBtn = screen.getByRole("button", { name: /불러오기/ });
    fireEvent.click(openModalBtn);

    const overwriteRadio = screen.getByDisplayValue("overwrite");
    fireEvent.click(overwriteRadio);
    expect(overwriteRadio).toBeChecked();

    const fileInput = screen.getByTestId("my-cards-file-input") as HTMLInputElement;
    const validJson = JSON.stringify({
      version: 1,
      exportedAt: "2026-09-11T00:00:00.000Z",
      cardCount: 2,
      cardIds: [30, 40],
    });
    const file = new File([validJson], "backup-overwrite.json", { type: "application/json" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockMyCards.importIds).toHaveBeenCalledWith([30, 40], "overwrite");
      expect(screen.getByRole("status")).toHaveTextContent("기존 카드를 대체하여 총 2장을 불러왔습니다.");
    });
  });

  it("불러오기 모달에서 Escape 키 입력 시 모달이 닫히고 배경 스크롤이 복원되어야 한다", () => {
    document.body.style.overflow = "auto";

    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const openModalBtn = screen.getByRole("button", { name: /불러오기/ });
    fireEvent.click(openModalBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    fireEvent.keyDown(window, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("전월 실적 트래커 컨트롤 바와 각 카드별 실적 진행바가 렌더링되어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    expect(screen.getByTestId("performance-tracker-control-bar")).toBeInTheDocument();
    expect(screen.getByLabelText("이번 달 월 지출액 입력")).toBeInTheDocument();
    expect(screen.getByText("시뮬레이터 지출 가져오기")).toBeInTheDocument();

    const progressbars = screen.getAllByRole("progressbar");
    expect(progressbars.length).toBe(mockMyCards.ids.length);
  });

  it("월 지출액 입력값 변경 시 실적 달성 현황 및 진행바가 갱신되어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const spendInput = screen.getByLabelText("이번 달 월 지출액 입력");
    fireEvent.change(spendInput, { target: { value: "1500000" } });

    expect(screen.getByTestId("overview-met-count")).toHaveTextContent("총 2장 중 2장 달성");
  });

  it("시뮬레이터 지출 가져오기 버튼 클릭 시 알림 토스트가 표시되어야 한다", () => {
    render(
      <ToastProvider>
        <MyCardsPage myCards={mockMyCards} />
      </ToastProvider>
    );

    const loadBtn = screen.getByRole("button", { name: /시뮬레이터 지출 가져오기/ });
    fireEvent.click(loadBtn);

    const status = screen.getByRole("status");
    expect(status).toBeInTheDocument();
  });
});

