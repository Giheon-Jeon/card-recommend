import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import axe from "axe-core";
import {
  resolveCachingStrategy,
  PWA_CACHE_NAMES,
  registerServiceWorker,
  applyServiceWorkerUpdate,
  unregisterServiceWorker,
} from "@/lib/pwa";
import { OfflineStatusBanner } from "@/components/common/OfflineStatusBanner";

describe("PWA Manifest & Service Worker Asset Verification", () => {
  it("manifest.webmanifest 파일이 유효한 JSON이며 standalone, 테마 컬러, 아이콘 설정을 포함해야 한다", () => {
    const manifestPath = path.resolve(process.cwd(), "public/manifest.webmanifest");
    expect(fs.existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
    expect(manifest.name).toContain("카드 혜택 트래커");
    expect(manifest.short_name).toBe("카드혜택트래커");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color).toBe("#4f46e5");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2);
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
  });

  it("public/sw.js 서비스 워커 파일이 존재하고 CacheFirst 및 StaleWhileRevalidate 핸들러를 포함해야 한다", () => {
    const swPath = path.resolve(process.cwd(), "public/sw.js");
    expect(fs.existsSync(swPath)).toBe(true);

    const swContent = fs.readFileSync(swPath, "utf-8");
    expect(swContent).toContain("cacheFirst");
    expect(swContent).toContain("staleWhileRevalidate");
    expect(swContent).toContain("SKIP_WAITING");
  });
});

describe("resolveCachingStrategy - 오프라인 캐싱 전략 판별", () => {
  it("카드 카탈로그 데이터(cards-catalog.json 및 번들 청크)는 CacheFirst 전략으로 분류해야 한다", () => {
    const jsonRoute = resolveCachingStrategy("/data/cards-catalog.json");
    expect(jsonRoute.strategy).toBe("CacheFirst");
    expect(jsonRoute.cacheName).toBe(PWA_CACHE_NAMES.catalog);

    const chunkRoute = resolveCachingStrategy("/assets/cards-catalog-BhwzMY-7.js");
    expect(chunkRoute.strategy).toBe("CacheFirst");
    expect(chunkRoute.cacheName).toBe(PWA_CACHE_NAMES.catalog);
  });

  it("정적 JS/CSS 번들 및 아이콘 애셋은 CacheFirst 전략으로 분류해야 한다", () => {
    const jsRoute = resolveCachingStrategy("/assets/index-C12SzwJw.js");
    expect(jsRoute.strategy).toBe("CacheFirst");
    expect(jsRoute.cacheName).toBe(PWA_CACHE_NAMES.static);

    const iconRoute = resolveCachingStrategy("/favicon.svg");
    expect(iconRoute.strategy).toBe("CacheFirst");
    expect(iconRoute.cacheName).toBe(PWA_CACHE_NAMES.static);
  });

  it("앱 셸 문서(/, /index.html) 및 웹앱 매니페스트는 StaleWhileRevalidate 전략으로 분류해야 한다", () => {
    const rootRoute = resolveCachingStrategy("/", "GET", true);
    expect(rootRoute.strategy).toBe("StaleWhileRevalidate");
    expect(rootRoute.cacheName).toBe(PWA_CACHE_NAMES.appShell);

    const manifestRoute = resolveCachingStrategy("/manifest.webmanifest");
    expect(manifestRoute.strategy).toBe("StaleWhileRevalidate");
    expect(manifestRoute.cacheName).toBe(PWA_CACHE_NAMES.appShell);
  });

  it("외부 Gemini API 호출 및 POST 요청은 NetworkOnly로 분류해야 한다", () => {
    const geminiRoute = resolveCachingStrategy(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    );
    expect(geminiRoute.strategy).toBe("NetworkOnly");
    expect(geminiRoute.cacheName).toBeNull();

    const postRoute = resolveCachingStrategy("/api/some-action", "POST");
    expect(postRoute.strategy).toBe("NetworkOnly");
  });
});

describe("Service Worker Lifecycle Management", () => {
  const originalServiceWorker = navigator.serviceWorker;

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      value: originalServiceWorker,
      configurable: true,
      writable: true,
    });
  });

  it("registerServiceWorker는 서비스 워커를 등록하고 콜백을 호출해야 한다", async () => {
    let updateFoundHandler: (() => void) | undefined;
    let stateChangeHandler: (() => void) | undefined;

    const mockInstallingWorker = {
      state: "installed",
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === "statechange") stateChangeHandler = cb;
      }),
    };

    const mockWaitingWorker = {
      postMessage: vi.fn(),
    };

    const mockRegistration = {
      installing: mockInstallingWorker,
      waiting: mockWaitingWorker,
      addEventListener: vi.fn((event: string, cb: () => void) => {
        if (event === "updatefound") updateFoundHandler = cb;
      }),
      unregister: vi.fn().mockResolvedValue(true),
    } as unknown as ServiceWorkerRegistration;

    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        register: vi.fn().mockResolvedValue(mockRegistration),
        getRegistrations: vi.fn().mockResolvedValue([mockRegistration]),
        controller: null,
      },
      configurable: true,
      writable: true,
    });

    const onRegistered = vi.fn();
    const onUpdateAvailable = vi.fn();
    const onOfflineReady = vi.fn();

    const reg = await registerServiceWorker("/sw.js", {
      onRegistered,
      onUpdateAvailable,
      onOfflineReady,
    });

    expect(reg).toBe(mockRegistration);
    expect(onRegistered).toHaveBeenCalledWith(mockRegistration);
    expect(onUpdateAvailable).toHaveBeenCalledWith(mockRegistration);

    // updatefound -> statechange(installed, controller 없음 -> onOfflineReady)
    updateFoundHandler?.();
    stateChangeHandler?.();
    expect(onOfflineReady).toHaveBeenCalledTimes(1);

    // SKIP_WAITING 전송 확인
    const applied = applyServiceWorkerUpdate(reg);
    expect(applied).toBe(true);
    expect(mockWaitingWorker.postMessage).toHaveBeenCalledWith({
      type: "SKIP_WAITING",
    });

    // 등록 해제 확인
    const unregistered = await unregisterServiceWorker();
    expect(unregistered).toBe(true);
  });
});

describe("OfflineStatusBanner Component & Network Events", () => {
  const originalOnLine = Object.getOwnPropertyDescriptor(navigator, "onLine");

  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", {
      value: true,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    if (originalOnLine) {
      Object.defineProperty(navigator, "onLine", originalOnLine);
    }
  });

  it("온라인 상태일 때는 오프라인 배너가 렌더링되지 않아야 한다", () => {
    render(<OfflineStatusBanner />);
    expect(screen.queryByTestId("offline-status-banner")).not.toBeInTheDocument();
  });

  it("offline 이벤트 발생 시 오프라인 배너가 표시되고 동작 가이드를 열고 닫을 수 있어야 한다", () => {
    render(<OfflineStatusBanner />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });

    const banner = screen.getByTestId("offline-status-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent("오프라인 모드 동작 중");

    const toggleBtn = screen.getByTestId("offline-guide-toggle-btn");
    fireEvent.click(toggleBtn);

    const guidePanel = screen.getByTestId("offline-guide-panel");
    expect(guidePanel).toBeInTheDocument();
    expect(screen.getByTestId("offline-capability-catalog-gallery")).toHaveTextContent("오프라인 가능");
    expect(screen.getByTestId("offline-capability-gemini-ocr-advice")).toHaveTextContent("온라인 필요");
  });

  it("오프라인에서 online 이벤트 발생 시 네트워크 복구 배너가 표시되고 닫기 버튼으로 닫을 수 있어야 한다", () => {
    render(<OfflineStatusBanner />);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByTestId("offline-status-banner")).toBeInTheDocument();

    act(() => {
      window.dispatchEvent(new Event("online"));
    });

    const reconnectedBanner = screen.getByTestId("online-reconnected-banner");
    expect(reconnectedBanner).toBeInTheDocument();
    expect(reconnectedBanner).toHaveTextContent("네트워크 연결이 복구되었습니다");

    fireEvent.click(screen.getByTestId("dismiss-reconnected-btn"));
    expect(screen.queryByTestId("online-reconnected-banner")).not.toBeInTheDocument();
  });

  it("오프라인 배너 및 동작 가이드 패널이 열린 상태에서 WCAG 접근성 위반이 없어야 한다", async () => {
    const { container } = render(<OfflineStatusBanner forceOffline />);

    fireEvent.click(screen.getByTestId("offline-guide-toggle-btn"));
    expect(screen.getByTestId("offline-guide-panel")).toBeInTheDocument();

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(results.violations).toEqual([]);
  });
});

