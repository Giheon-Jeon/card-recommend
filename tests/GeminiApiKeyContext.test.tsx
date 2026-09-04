import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GeminiApiKeyProvider, useGeminiApiKey } from "@/contexts/GeminiApiKeyContext";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <GeminiApiKeyProvider>{children}</GeminiApiKeyProvider>
);

describe("GeminiApiKeyContext", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("스토리지에 저장된 키가 없을 경우 빈 키와 session 기본 타입을 반환한다", () => {
    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    expect(result.current.apiKey).toBe("");
    expect(result.current.storageType).toBe("session");
  });

  it("sessionStorage에 키가 존재하면 세션 스토리지에서 우선 로드한다", () => {
    sessionStorage.setItem("gemini_api_key", "session-key-123");
    localStorage.setItem("gemini_api_key", "local-key-456");

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    expect(result.current.apiKey).toBe("session-key-123");
    expect(result.current.storageType).toBe("session");
  });

  it("sessionStorage에 키가 없고 localStorage에만 키가 존재하면 로컬 스토리지에서 로드한다", () => {
    localStorage.setItem("gemini_api_key", "local-key-789");

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    expect(result.current.apiKey).toBe("local-key-789");
    expect(result.current.storageType).toBe("local");
  });

  it("saveApiKey 호출 시 session 모드이면 sessionStorage에 저장하고 localStorage에서는 삭제한다", () => {
    localStorage.setItem("gemini_api_key", "old-local-key");

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    act(() => {
      result.current.saveApiKey("new-session-key", "session");
    });

    expect(result.current.apiKey).toBe("new-session-key");
    expect(result.current.storageType).toBe("session");
    expect(sessionStorage.getItem("gemini_api_key")).toBe("new-session-key");
    expect(localStorage.getItem("gemini_api_key")).toBeNull();
  });

  it("saveApiKey 호출 시 local 모드이면 localStorage에 저장하고 sessionStorage에서는 삭제한다", () => {
    sessionStorage.setItem("gemini_api_key", "old-session-key");

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    act(() => {
      result.current.saveApiKey("new-local-key", "local");
    });

    expect(result.current.apiKey).toBe("new-local-key");
    expect(result.current.storageType).toBe("local");
    expect(localStorage.getItem("gemini_api_key")).toBe("new-local-key");
    expect(sessionStorage.getItem("gemini_api_key")).toBeNull();
  });

  it("removeApiKey 호출 시 sessionStorage와 localStorage 모두에서 삭제된다", () => {
    sessionStorage.setItem("gemini_api_key", "key-to-remove");
    localStorage.setItem("gemini_api_key", "key-to-remove");

    const { result } = renderHook(() => useGeminiApiKey(), { wrapper });

    act(() => {
      result.current.removeApiKey();
    });

    expect(result.current.apiKey).toBe("");
    expect(sessionStorage.getItem("gemini_api_key")).toBeNull();
    expect(localStorage.getItem("gemini_api_key")).toBeNull();
  });
});
