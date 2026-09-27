import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useTheme } from "@/hooks/useTheme";

function TestConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-val">{theme}</span>
      <span data-testid="resolved-val">{resolvedTheme}</span>
      <button type="button" onClick={() => setTheme("light")}>
        라이트
      </button>
      <button type="button" onClick={() => setTheme("dark")}>
        다크
      </button>
      <button type="button" onClick={() => setTheme("system")}>
        시스템
      </button>
    </div>
  );
}

describe("다크 모드 테마 시스템 (ThemeContext & ThemeToggle)", () => {
  let mediaQueryListeners: ((e: MediaQueryListEvent) => void)[] = [];
  let currentMatches = false;

  beforeEach(() => {
    mediaQueryListeners = [];
    currentMatches = false;
    window.localStorage.clear();
    document.documentElement.classList.remove("dark");
    document.documentElement.removeAttribute("data-theme");

    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      return {
        matches: currentMatches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            mediaQueryListeners.push(handler);
          }
        }),
        removeEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
          if (event === "change") {
            mediaQueryListeners = mediaQueryListeners.filter((l) => l !== handler);
          }
        }),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("기본 테마는 system이며, 시스템이 라이트 모드일 때 light로 해석된다", () => {
    currentMatches = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("system");
    expect(screen.getByTestId("resolved-val").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("시스템이 다크 모드일 때 system 테마는 dark로 해석되고 dark 클래스가 붙는다", () => {
    currentMatches = true;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme-val").textContent).toBe("system");
    expect(screen.getByTestId("resolved-val").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("테마를 dark로 변경하면 HTML 태그에 dark 클래스가 적용되고 localStorage에 저장된다", () => {
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "다크" }));

    expect(screen.getByTestId("theme-val").textContent).toBe("dark");
    expect(screen.getByTestId("resolved-val").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("theme-mode")).toBe("dark");
  });

  it("테마를 light로 변경하면 HTML 태그의 dark 클래스가 제거되고 localStorage에 저장된다", () => {
    window.localStorage.setItem("theme-mode", "dark");
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "라이트" }));

    expect(screen.getByTestId("theme-val").textContent).toBe("light");
    expect(screen.getByTestId("resolved-val").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("theme-mode")).toBe("light");
  });

  it("system 모드일 때 OS 테마 미디어 쿼리 변경 이벤트가 발생하면 실시간 동기화된다", () => {
    currentMatches = false;
    render(
      <ThemeProvider>
        <TestConsumer />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("resolved-val").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    // OS 테마가 다크 모드로 변경되는 이벤트 트리거
    act(() => {
      mediaQueryListeners.forEach((listener) =>
        listener({ matches: true, media: "(prefers-color-scheme: dark)" } as MediaQueryListEvent),
      );
    });

    expect(screen.getByTestId("resolved-val").textContent).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    // 다시 라이트로 변경
    act(() => {
      mediaQueryListeners.forEach((listener) =>
        listener({ matches: false, media: "(prefers-color-scheme: dark)" } as MediaQueryListEvent),
      );
    });

    expect(screen.getByTestId("resolved-val").textContent).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ThemeToggle 컴포넌트가 WAI-ARIA 규격을 준수하고 테마 전환을 지원한다", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>,
    );

    const container = screen.getByLabelText("테마 선택");
    expect(container).toBeInTheDocument();

    const lightBtn = screen.getByRole("button", { name: "라이트 모드" });
    const darkBtn = screen.getByRole("button", { name: "다크 모드" });
    const systemBtn = screen.getByRole("button", { name: "시스템 설정 동기화" });

    expect(systemBtn).toHaveAttribute("aria-pressed", "true");
    expect(darkBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(darkBtn);

    expect(darkBtn).toHaveAttribute("aria-pressed", "true");
    expect(systemBtn).toHaveAttribute("aria-pressed", "false");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    fireEvent.click(lightBtn);
    expect(lightBtn).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("ThemeProvider 바깥에서 useTheme을 호출하면 기본 fallback 컨텍스트가 반환된다", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("theme-val").textContent).toBe("system");
    expect(screen.getByTestId("resolved-val").textContent).toBe("light");
  });
});
