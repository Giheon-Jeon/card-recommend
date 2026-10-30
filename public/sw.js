/**
 * 카드 혜택 트래커 Service Worker (PWA 오프라인 지원)
 * - 카탈로그 데이터(cards-catalog) 및 정적 애셋(/assets/*): CacheFirst 전략
 * - 앱 셸(/, /index.html, /manifest.webmanifest): StaleWhileRevalidate 전략
 * - 오프라인 네비게이션 폴백 지원
 */

const CACHE_NAMES = {
  static: "card-tracker-static-v1",
  catalog: "card-tracker-catalog-v1",
  appShell: "card-tracker-shell-v1",
};

const VALID_CACHES = new Set(Object.values(CACHE_NAMES));

// 빌드 시 cardTrackerPwaPlugin에 의해 정적 애셋 목록이 주입됩니다.
const PRECACHE_URLS = self.__PRECACHE_MANIFEST__ || [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/favicon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAMES.appShell)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (!VALID_CACHES.has(key)) {
              return caches.delete(key);
            }
            return Promise.resolve(false);
          }),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCatalogAsset(pathname) {
  return (
    pathname.includes("cards-catalog") &&
    (pathname.endsWith(".json") || pathname.endsWith(".js"))
  );
}

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/assets/") ||
    /\.(js|css|svg|png|jpg|jpeg|webp|ico|woff2?)$/i.test(pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const networkResponse = await networkPromise;
  if (networkResponse) {
    return networkResponse;
  }

  // 네비게이션 요청의 오프라인 폴백
  if (request.mode === "navigate") {
    const fallback = await cache.match("/index.html") || (await cache.match("/"));
    if (fallback) return fallback;
  }

  return new Response("오프라인 상태입니다.", {
    status: 503,
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 동일 출처 요청만 캐싱 처리 (Gemini API 등 외부 요청 제외)
  if (url.origin !== self.location.origin) return;

  if (isCatalogAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.catalog));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.appShell));
});
