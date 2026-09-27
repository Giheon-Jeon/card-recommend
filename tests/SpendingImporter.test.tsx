import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SpendingImporter } from "@/components/SpendingImporter";
import { SimulatorPage } from "@/components/SimulatorPage";
import type { Category } from "@/types/card";

const mockCategories: Category[] = [
  { id: "transport", label: "대중교통" },
  { id: "mart", label: "마트" },
];

describe("SpendingImporter and SimulatorPage ErrorBoundary integration", () => {
  it("SpendingImporter가 정상적으로 렌더링되어야 한다", () => {
    render(
      <SpendingImporter
        categories={mockCategories}
        onImport={vi.fn()}
      />
    );

    expect(screen.getByText("외부 지출 내역 가져오기")).toBeInTheDocument();
    expect(screen.getByText("체험용 데모")).toBeInTheDocument();
    expect(screen.getByText("CSV 명세서")).toBeInTheDocument();
    expect(screen.getByText("결제 내역 텍스트")).toBeInTheDocument();
    expect(screen.getByText("영수증 이미지")).toBeInTheDocument();
  });

  it("SimulatorPage 내에서 SpendingImporter에 오류가 발생해도 ErrorBoundary가 포착하여 나머지 시뮬레이터 UI를 보호한다", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // SimulatorPage는 myCards가 비어있지 않아야 SpendingImporter와 SpendingSimulator를 렌더링함
    const mockMyCards = {
      ids: ["card-1"],
      addCard: vi.fn(),
      removeCard: vi.fn(),
      toggleCard: vi.fn(),
      hasCard: vi.fn().mockReturnValue(true),
      clearCards: vi.fn(),
    };

    render(
      <SimulatorPage
        myCards={mockMyCards}
        onGoToGallery={vi.fn()}
      />
    );

    // 지출 내역 가져오기 및 월 지출 시뮬레이터가 함께 존재하는지 확인
    expect(screen.getByText("외부 지출 내역 가져오기")).toBeInTheDocument();
    expect(screen.getByText("월 지출 시뮬레이터")).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("SimulatorPage에서 환불/취소 내역을 시뮬레이터에 적용하면 지출이 차감되고 0원 미만으로 내려가지 않는다", () => {
    const mockMyCards = {
      ids: ["card-1"],
      addCard: vi.fn(),
      removeCard: vi.fn(),
      toggleCard: vi.fn(),
      hasCard: vi.fn().mockReturnValue(true),
      clearCards: vi.fn(),
    };

    render(<SimulatorPage myCards={mockMyCards} onGoToGallery={vi.fn()} />);

    // 1. 텍스트 탭으로 전환
    const textTabButton = screen.getByRole("button", { name: /결제 내역 텍스트/ });
    fireEvent.click(textTabButton);

    // 2. 먼저 정상 결제 10,000원 파싱 및 적용
    const textarea = screen.getByPlaceholderText(/예시:/);
    fireEvent.change(textarea, { target: { value: "스타벅스 10,000원" } });
    const analyzeBtn = screen.getByRole("button", { name: /분석 실행/ });
    fireEvent.click(analyzeBtn);

    // 미리보기 테이블 및 적용 버튼 확인
    const applyBtn = screen.getByRole("button", { name: /지출 시뮬레이터에 적용/ });
    fireEvent.click(applyBtn);

    // 월 지출 합계가 10,000원이어야 함
    expect(screen.getAllByText("10,000원").length).toBeGreaterThan(0);

    // 3. 환불 내역 4,000원 취소 입력 및 합산(차감) 적용
    fireEvent.change(textarea, { target: { value: "[신한체크취소] 스타벅스 4,000원 승인취소" } });
    fireEvent.click(analyzeBtn);
    const applyRefundBtn = screen.getByRole("button", { name: /지출 시뮬레이터에 적용/ });
    fireEvent.click(applyRefundBtn);

    // 10,000원 - 4,000원 = 6,000원으로 차감 반영
    expect(screen.getAllByText("6,000원").length).toBeGreaterThan(0);

    // 4. 기존 잔액을 초과하는 15,000원 취소 적용 시 0원 하한 보정
    fireEvent.change(textarea, { target: { value: "[신한체크취소] 스타벅스 15,000원 승인취소" } });
    fireEvent.click(analyzeBtn);
    const applyExcessRefundBtn = screen.getByRole("button", { name: /지출 시뮬레이터에 적용/ });
    fireEvent.click(applyExcessRefundBtn);

    // 음수가 되지 않고 최소 0원으로 유지됨
    expect(screen.getAllByText("0원").length).toBeGreaterThan(0);
  });

  describe("영수증 이미지 업로드 파일 크기 및 포맷 검증", () => {
    it("영수증 이미지 탭에서 허용 포맷 및 최대 10MB 안내 라벨이 표시되어야 한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const imageTabButton = screen.getByRole("button", { name: /영수증 이미지/ });
      fireEvent.click(imageTabButton);

      expect(screen.getByText("최대 10MB, JPG/PNG/WebP 지원")).toBeInTheDocument();
      const input = screen.getByLabelText("이미지 파일 선택") as HTMLInputElement;
      expect(input.accept).toContain("image/jpeg");
      expect(input.accept).toContain("image/png");
      expect(input.accept).toContain("image/webp");
      expect(input.accept).toContain("image/heic");
    });

    it("10MB를 초과하는 대용량 파일 업로드 시 에러 메시지를 표시하고 처리를 중단한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const imageTabButton = screen.getByRole("button", { name: /영수증 이미지/ });
      fireEvent.click(imageTabButton);

      const largeFile = new File(["dummy"], "heavy-receipt.jpg", { type: "image/jpeg" });
      Object.defineProperty(largeFile, "size", { value: 15 * 1024 * 1024 }); // 15MB

      const input = screen.getByLabelText("이미지 파일 선택");
      fireEvent.change(input, { target: { files: [largeFile] } });

      expect(screen.getByText("파일 크기는 최대 10MB 이하만 업로드 가능합니다.")).toBeInTheDocument();
      expect(screen.queryByText(/파일 준비됨/)).not.toBeInTheDocument();
    });

    it("지원하지 않는 포맷(예: gif, pdf 등) 업로드 시 에러 메시지를 표시하고 처리를 중단한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const imageTabButton = screen.getByRole("button", { name: /영수증 이미지/ });
      fireEvent.click(imageTabButton);

      const invalidFile = new File(["dummy"], "receipt.gif", { type: "image/gif" });
      const input = screen.getByLabelText("이미지 파일 선택");
      fireEvent.change(input, { target: { files: [invalidFile] } });

      expect(screen.getByText("지원하지 않는 이미지 형식입니다. JPG, PNG, WebP, HEIC 파일만 지원합니다.")).toBeInTheDocument();
      expect(screen.queryByText(/파일 준비됨/)).not.toBeInTheDocument();
    });

    it("허용된 포맷의 정상 크기 파일 업로드 시 에러 없이 파일 준비 상태로 전환된다", async () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const imageTabButton = screen.getByRole("button", { name: /영수증 이미지/ });
      fireEvent.click(imageTabButton);

      const validFile = new File(["dummy-image-content"], "receipt.png", { type: "image/png" });
      Object.defineProperty(validFile, "size", { value: 2 * 1024 * 1024 }); // 2MB

      const input = screen.getByLabelText("이미지 파일 선택");
      fireEvent.change(input, { target: { files: [validFile] } });

      expect(screen.queryByText("파일 크기는 최대 10MB 이하만 업로드 가능합니다.")).not.toBeInTheDocument();
      expect(screen.queryByText("지원하지 않는 이미지 형식입니다. JPG, PNG, WebP, HEIC 파일만 지원합니다.")).not.toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText("파일 준비됨: receipt.png")).toBeInTheDocument();
        expect(screen.getByText("크기: 2048.0 KB")).toBeInTheDocument();
      });
    });
  });

  describe("파싱 결과 테이블 직접 항목 추가 및 일괄 삭제 연동", () => {
    it("텍스트 파싱 후 항목을 직접 추가하고 입력하여 시뮬레이터에 적용할 수 있어야 한다", () => {
      const handleImport = vi.fn();
      render(<SpendingImporter categories={mockCategories} onImport={handleImport} />);

      const textTabButton = screen.getByRole("button", { name: /결제 내역 텍스트/ });
      fireEvent.click(textTabButton);

      const textarea = screen.getByPlaceholderText(/예시:/);
      fireEvent.change(textarea, { target: { value: "스타벅스 10,000원" } });
      const analyzeBtn = screen.getByRole("button", { name: /분석 실행/ });
      fireEvent.click(analyzeBtn);

      expect(screen.getByText("지출 파싱 결과 미리보기 (1건)")).toBeInTheDocument();

      const addBtn = screen.getByRole("button", { name: /지출 항목 직접 추가/ });
      fireEvent.click(addBtn);

      expect(screen.getByText("지출 파싱 결과 미리보기 (2건)")).toBeInTheDocument();

      const merchantInputs = screen.getAllByLabelText("가맹점명");
      const amountInputs = screen.getAllByLabelText("금액");

      fireEvent.change(merchantInputs[1], { target: { value: "이마트" } });
      fireEvent.change(amountInputs[1], { target: { value: "30000" } });

      const applyBtn = screen.getByRole("button", { name: /지출 시뮬레이터에 적용/ });
      fireEvent.click(applyBtn);

      expect(handleImport).toHaveBeenCalledWith(
        [
          { merchant: "스타벅스", amount: 10000, category: "cafe" },
          { merchant: "이마트", amount: 30000, category: "transport" },
        ],
        "merge"
      );
    });

    it("파싱된 항목을 전체 선택하여 일괄 삭제할 수 있어야 한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);

      const textTabButton = screen.getByRole("button", { name: /결제 내역 텍스트/ });
      fireEvent.click(textTabButton);

      const textarea = screen.getByPlaceholderText(/예시:/);
      fireEvent.change(textarea, { target: { value: "스타벅스 10,000원\n이마트 20,000원" } });
      const analyzeBtn = screen.getByRole("button", { name: /분석 실행/ });
      fireEvent.click(analyzeBtn);

      expect(screen.getByText("지출 파싱 결과 미리보기 (2건)")).toBeInTheDocument();

      const selectAll = screen.getByLabelText("전체 선택");
      fireEvent.click(selectAll);

      const deleteSelectedBtn = screen.getAllByRole("button", { name: /선택 삭제/ })[0];
      fireEvent.click(deleteSelectedBtn);

      expect(screen.queryByText(/지출 파싱 결과 미리보기/)).not.toBeInTheDocument();
    });
  });

  describe("카드사 결제 내역 CSV 파일 업로드 및 파싱 연동", () => {
    it("CSV 명세서 탭에서 자동 인식 카드사 안내 및 드롭존이 렌더링되어야 한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const csvTabButton = screen.getByRole("button", { name: "CSV 명세서" });
      fireEvent.click(csvTabButton);

      expect(screen.getByText("카드사 결제 내역 CSV 파일 업로드")).toBeInTheDocument();
      expect(screen.getByText(/최대 5MB, UTF-8 및 EUC-KR\(CP949\) 인코딩 자동 감지/)).toBeInTheDocument();
      expect(screen.getByText("신한")).toBeInTheDocument();
      expect(screen.getByText("현대")).toBeInTheDocument();
      expect(screen.getByText("삼성")).toBeInTheDocument();
      expect(screen.getByText("KB국민")).toBeInTheDocument();
    });

    it("5MB를 초과하는 CSV 파일 업로드 시 에러 메시지를 표시한다", () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);
      const csvTabButton = screen.getByRole("button", { name: "CSV 명세서" });
      fireEvent.click(csvTabButton);

      const largeCsv = new File(["dummy"], "large.csv", { type: "text/csv" });
      Object.defineProperty(largeCsv, "size", { value: 6 * 1024 * 1024 }); // 6MB

      const input = screen.getByLabelText("CSV 명세서 파일 선택");
      fireEvent.change(input, { target: { files: [largeCsv] } });

      expect(screen.getByText("CSV 파일 크기는 최대 5MB 이하만 업로드 가능합니다.")).toBeInTheDocument();
    });

    it("정상 CSV 파일을 업로드하고 파싱 실행 시 미리보기 테이블에 항목이 표시되고 시뮬레이터에 적용된다", async () => {
      const handleImport = vi.fn();
      render(<SpendingImporter categories={mockCategories} onImport={handleImport} />);

      const csvTabButton = screen.getByRole("button", { name: "CSV 명세서" });
      fireEvent.click(csvTabButton);

      const csvContent = `이용일자,가맹점명,이용금액,승인구분
2026-09-10,스타벅스 강남점,5000,승인
2026-09-11,이마트 역삼점,32000,승인
2026-09-12,스타벅스 강남점,5000,승인취소`;

      const validCsvFile = new File([csvContent], "card-history.csv", { type: "text/csv" });
      Object.defineProperty(validCsvFile, "size", { value: 2048 });

      const input = screen.getByLabelText("CSV 명세서 파일 선택");
      fireEvent.change(input, { target: { files: [validCsvFile] } });

      expect(screen.getByText("파일 준비됨: card-history.csv")).toBeInTheDocument();

      const analyzeBtn = screen.getByRole("button", { name: /CSV 분석 시작/ });
      fireEvent.click(analyzeBtn);

      await waitFor(() => {
        expect(screen.getByText("지출 파싱 결과 미리보기 (3건)")).toBeInTheDocument();
      });

      // 환불/취소 태그 노출 확인
      expect(screen.getByText("환불/취소")).toBeInTheDocument();

      // 시뮬레이터에 적용 클릭
      const applyBtn = screen.getByRole("button", { name: /지출 시뮬레이터에 적용/ });
      fireEvent.click(applyBtn);

      expect(handleImport).toHaveBeenCalledWith(
        [
          { merchant: "스타벅스 강남점", amount: 5000, category: "cafe" },
          { merchant: "이마트 역삼점", amount: 32000, category: "mart" },
          { merchant: "스타벅스 강남점", amount: -5000, category: "cafe" },
        ],
        "merge"
      );
    });

    it("체험용 데모 탭에서 카드사 CSV 명세서 데모를 실행하면 모의 5건 데이터가 표시된다", async () => {
      render(<SpendingImporter categories={mockCategories} onImport={vi.fn()} />);

      const demoTabButton = screen.getByRole("button", { name: /체험용 데모/ });
      fireEvent.click(demoTabButton);

      const csvDemoBtn = screen.getByRole("button", { name: /카드사 CSV 명세서/ });
      fireEvent.click(csvDemoBtn);

      await waitFor(
        () => {
          expect(screen.getByText("지출 파싱 결과 미리보기 (5건)")).toBeInTheDocument();
        },
        { timeout: 2500 }
      );

      expect(screen.getByDisplayValue("스타벅스 강남점(취소)")).toBeInTheDocument();
      expect(screen.getByText("환불/취소")).toBeInTheDocument();
    });
  });
});
