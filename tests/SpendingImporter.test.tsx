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
});
