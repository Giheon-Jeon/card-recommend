/**
 * [Issue #104] PWA(Progressive Web App) 오프라인 캐싱 전략 및 서비스 워커 수명주기 관리 유틸리티
 */

export type CacheStrategy = "CacheFirst" | "StaleWhileRevalidate" | "NetworkOnly";

export const PWA_CACHE_NAMES = {
  static: "card-tracker-static-v1",
  catalog: "card-tracker-catalog-v1",
  appShell: "card-tracker-shell-v1",
} as const;

export interface CacheRouteDecision {
  strategy: CacheStrategy;
  cacheName: string | null;
  reason: string;
}

export interface OfflineCapabilityItem {
  id: string;
  feature: string;
  availableOffline: boolean;
  description: string;
}

export const OFFLINE_CAPABILITIES: OfflineCapabilityItem[] = [
  {
    id: "catalog-gallery",
    feature: "카드 갤러리 및 조건별 필터·비교",
    availableOffline: true,
    description: "로컬 캐싱된 977개 전체 카드 카탈로그 검색, 혜택 비교 및 인쇄",
  },
  {
    id: "my-cards",
    feature: "내 카드 보관함 및 D-Day 트래커",
    availableOffline: true,
    description: "전월 실적 마감 D-Day, 연회비 청구 D-Day·손익 분석, JSON 백업 및 복원",
  },
  {
    id: "simulator-local",
    feature: "혜택 시뮬레이터 및 CSV/엑셀 명세서 파싱",
    availableOffline: true,
    description: "라이프스타일 프리셋, 직접 입력, 카드사 CSV·엑셀(.xlsx/.xls) 로컬 파싱 및 추천",
  },
  {
    id: "gemini-ocr-advice",
    feature: "Gemini AI 영수증 OCR 및 AI 소비 조언",
    availableOffline: false,
    description: "외부 Gemini API 통신이 필요하므로 네트워크 연결 시 활성화",
  },
];

/**
 * 요청 URL과 메서드, 네비게이션 여부에 따라 PWA 오프라인 캐싱 전략을 결정합니다.
 * - 카탈로그 데이터(cards-catalog.json / cards-catalog-*.js): CacheFirst
 * - 정적 번들 및 아이콘(/assets/*, .svg, .png, .woff2): CacheFirst
 * - 앱 셸 문서(/, /index.html, manifest.webmanifest, /demo/*): StaleWhileRevalidate
 * - 외부 API(Gemini API 등) 및 비-GET 요청: NetworkOnly
 */
export function resolveCachingStrategy(
  requestUrl: string | URL,
  requestMethod = "GET",
  isNavigation = false,
): CacheRouteDecision {
  if (requestMethod.toUpperCase() !== "GET") {
    return {
      strategy: "NetworkOnly",
      cacheName: null,
      reason: "GET 이외의 변경 요청은 캐싱하지 않습니다.",
    };
  }

  let parsed: URL;
  try {
    parsed =
      typeof requestUrl === "string"
        ? new URL(requestUrl, "https://card-tracker.local")
        : requestUrl;
  } catch {
    return {
      strategy: "NetworkOnly",
      cacheName: null,
      reason: "유효하지 않은 URL 형식입니다.",
    };
  }

  // 외부 도메인 API (예: Google Gemini API) 호출은 항상 NetworkOnly
  if (
    parsed.hostname.includes("googleapis.com") ||
    parsed.hostname.includes("gstatic.com") ||
    (parsed.protocol !== "http:" && parsed.protocol !== "https:")
  ) {
    return {
      strategy: "NetworkOnly",
      cacheName: null,
      reason: "외부 AI API 및 비표준 프로토콜 요청은 네트워크 전용으로 처리합니다.",
    };
  }

  const pathname = parsed.pathname;

  // 1. 카탈로그 데이터 (cards-catalog.json 및 빌드된 cards-catalog 청크) -> CacheFirst
  if (
    pathname.includes("cards-catalog") &&
    (pathname.endsWith(".json") || pathname.endsWith(".js"))
  ) {
    return {
      strategy: "CacheFirst",
      cacheName: PWA_CACHE_NAMES.catalog,
      reason: "대용량 카드 카탈로그 데이터는 CacheFirst로 즉시 응답합니다.",
    };
  }

  // 2. 해시된 정적 애셋 및 아이콘/폰트 -> CacheFirst
  if (
    pathname.startsWith("/assets/") ||
    /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(pathname)
  ) {
    return {
      strategy: "CacheFirst",
      cacheName: PWA_CACHE_NAMES.static,
      reason: "정적 스크립트·스타일시트·아이콘 애셋은 CacheFirst로 제공합니다.",
    };
  }

  // 3. 앱 셸 문서, 웹앱 매니페스트, 데모 데이터 -> StaleWhileRevalidate
  if (
    isNavigation ||
    pathname === "/" ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("manifest.webmanifest") ||
    pathname.startsWith("/demo/")
  ) {
    return {
      strategy: "StaleWhileRevalidate",
      cacheName: PWA_CACHE_NAMES.appShell,
      reason: "앱 셸 및 매니페스트는 캐시 우선 반환 후 백그라운드에서 최신화합니다.",
    };
  }

  return {
    strategy: "StaleWhileRevalidate",
    cacheName: PWA_CACHE_NAMES.appShell,
    reason: "기본 동일 출처 GET 요청은 StaleWhileRevalidate로 처리합니다.",
  };
}

export interface ServiceWorkerLifecycleCallbacks {
  onRegistered?: (registration: ServiceWorkerRegistration) => void;
  onUpdateAvailable?: (registration: ServiceWorkerRegistration) => void;
  onOfflineReady?: () => void;
  onError?: (error: unknown) => void;
}

/**
 * 서비스 워커를 등록하고 수명주기(설치 완료, 업데이트 감지) 이벤트를 연결합니다.
 */
export async function registerServiceWorker(
  swUrl = "/sw.js",
  callbacks?: ServiceWorkerLifecycleCallbacks,
): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(swUrl, {
      scope: "/",
    });

    callbacks?.onRegistered?.(registration);

    if (registration.waiting) {
      callbacks?.onUpdateAvailable?.(registration);
    }

    registration.addEventListener("updatefound", () => {
      const installingWorker = registration.installing;
      if (!installingWorker) return;

      installingWorker.addEventListener("statechange", () => {
        if (installingWorker.state === "installed") {
          if (navigator.serviceWorker.controller) {
            // 기존 컨트롤러가 있으면 새 버전 업데이트 대기 상태
            callbacks?.onUpdateAvailable?.(registration);
          } else {
            // 최초 설치 완료 (오프라인 구동 준비 완료)
            callbacks?.onOfflineReady?.();
          }
        }
      });
    });

    return registration;
  } catch (error) {
    callbacks?.onError?.(error);
    return null;
  }
}

/**
 * 대기 중인 신규 서비스 워커에 SKIP_WAITING 메시지를 전송하여 즉시 활성화합니다.
 */
export function applyServiceWorkerUpdate(
  registration?: ServiceWorkerRegistration | null,
): boolean {
  if (!registration || !registration.waiting) {
    return false;
  }
  registration.waiting.postMessage({ type: "SKIP_WAITING" });
  return true;
}

/**
 * 등록된 모든 서비스 워커를 해제합니다.
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    let unregisteredAny = false;
    for (const reg of registrations) {
      const result = await reg.unregister();
      if (result) unregisteredAny = true;
    }
    return unregisteredAny;
  } catch {
    return false;
  }
}
