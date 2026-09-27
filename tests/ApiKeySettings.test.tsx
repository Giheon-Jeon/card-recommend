import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ApiKeySettings } from "@/components/ApiKeySettings";

describe("ApiKeySettings", () => {
  it("키가 없을 때 비활성 상태 버튼을 표시한다", () => {
    render(
      <ApiKeySettings
        apiKey=""
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Gemini API 설정")).toBeInTheDocument();
  });

  it("키가 있을 때 활성화 상태 및 스토리지 종류를 표시한다", () => {
    render(
      <ApiKeySettings
        apiKey="AIzaSyDummyKey"
        storageType="session"
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    expect(screen.getByText("Gemini AI (세션)")).toBeInTheDocument();
  });

  it("버튼을 클릭하면 보안 경고 배너 및 저장 방식 선택 팝오버가 표시된다", () => {
    render(
      <ApiKeySettings
        apiKey=""
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText("Gemini API 설정"));

    expect(screen.getByText("Gemini API Key 보안 설정")).toBeInTheDocument();
    expect(screen.getByText("보안 및 키 보관 주의사항")).toBeInTheDocument();
    expect(screen.getByText("세션 스토리지 보관")).toBeInTheDocument();
    expect(screen.getByText("로컬 스토리지 보관 (영구 유지)")).toBeInTheDocument();
  });

  it("저장 방식 라디오 버튼 변경 후 저장 버튼 클릭 시 선택한 스토리지 타입과 함께 onSave를 호출한다", () => {
    const handleSave = vi.fn();
    const handleStorageChange = vi.fn();

    render(
      <ApiKeySettings
        apiKey="AIzaSyDummyKey"
        storageType="session"
        onChange={vi.fn()}
        onSave={handleSave}
        onRemove={vi.fn()}
        onStorageTypeChange={handleStorageChange}
      />
    );

    fireEvent.click(screen.getByText("Gemini AI (세션)"));

    const localRadio = screen.getByDisplayValue("local");
    fireEvent.click(localRadio);

    expect(handleStorageChange).toHaveBeenCalledWith("local");

    const saveButton = screen.getByRole("button", { name: "저장" });
    fireEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith("local");
  });

  it("삭제 버튼 클릭 시 onRemove가 호출된다", () => {
    const handleRemove = vi.fn();

    render(
      <ApiKeySettings
        apiKey="AIzaSyDummyKey"
        onChange={vi.fn()}
        onSave={vi.fn()}
        onRemove={handleRemove}
      />
    );

    fireEvent.click(screen.getByText("Gemini AI (세션)"));

    const removeButton = screen.getByRole("button", { name: "삭제" });
    fireEvent.click(removeButton);

    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});
