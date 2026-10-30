---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] PWA(Progressive Web App) 오프라인 지원 및 웹앱 매니페스트(Web App Manifest & Service Worker)"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
스마트폰 및 데스크톱에서 브라우저 주소창 없이 앱처럼 설치(Add to Home Screen)할 수 있도록 Web App Manifest와 서비스 워커를 구축하고, 네트워크가 끊긴 오프라인 환경에서도 로컬 저장된 내 카드와 시뮬레이터를 완벽히 구동합니다.

## 작업 상세 내용
- [x] `manifest.webmanifest` (아이콘, 테마 컬러, standalone) 및 Vite PWA 프리캐시 빌드 플러그인 구성 (`public/manifest.webmanifest`, `index.html`, `vite.config.ts`)
  - `display: "standalone"`, `theme_color: "#4f46e5"`, `background_color: "#f8fafc"`, `any`/`maskable` 아이콘을 포함한 `public/manifest.webmanifest` 구성
  - `index.html`에 매니페스트 링크 및 Apple/모바일 웹앱 메타 태그 추가
  - `vite.config.ts`에 `cardTrackerPwaPlugin`을 구현하여 프로덕션 빌드 시 생성된 정적 애셋 및 `cards-catalog-*.js` 청크 목록을 `dist/sw.js`의 프리캐시 매니페스트에 자동 주입
- [x] 카탈로그 데이터(`cards-catalog.json`) 및 정적 애셋 `CacheFirst`/`StaleWhileRevalidate` 오프라인 캐싱 전략 수립 (`public/sw.js`, `src/lib/pwa.ts`, `src/main.tsx`)
  - 카드 카탈로그 데이터(`cards-catalog.json`, `cards-catalog-*.js`) 및 해시된 정적 번들(`/assets/*`, 아이콘, 폰트)에 `CacheFirst` 전략 적용
  - 앱 셸 문서(`/`, `/index.html`), `manifest.webmanifest`, 데모 샘플 데이터(`/demo/*`)에 `StaleWhileRevalidate` 및 오프라인 네비게이션 폴백 적용
  - 외부 Gemini API 요청 및 비-GET 요청은 `NetworkOnly`로 분리하여 보안 및 API 정합성 유지
  - 서비스 워커 등록(`registerServiceWorker`), 즉시 업데이트 반영(`applyServiceWorkerUpdate`), 등록 해제(`unregisterServiceWorker`) 수명주기 유틸리티 구현
- [x] 네트워크 오프라인 감지 인디케이터 배너 및 오프라인 동작 가이드 UI 추가 (`src/components/common/OfflineStatusBanner.tsx`, `src/App.tsx`)
  - `window`의 `online` / `offline` 이벤트를 실시간 추적하는 `useNetworkStatus` 훅 구현
  - 오프라인 전환 시 상단 경고 인디케이터 배너(`data-testid="offline-status-banner"`) 및 온라인 복구 알림 배너(`data-testid="online-reconnected-banner"`) 노출
  - 오프라인에서 사용 가능한 기능(카드 갤러리·비교, 내 카드 보관함·D-Day 트래커, 혜택 시뮬레이터·CSV/엑셀 로컬 파싱)과 온라인 연결이 필요한 기능(Gemini AI OCR·소비 조언)을 안내하는 토글 가이드 패널(`data-testid="offline-guide-panel"`) 제공
- [x] PWA 빌드 파이프라인 및 서비스 워커 수명주기 검증 (`tests/pwa.test.tsx`)
  - `manifest.webmanifest` 스키마 검증, 캐싱 전략 라우팅(`CacheFirst` / `StaleWhileRevalidate` / `NetworkOnly`), 서비스 워커 수명주기 모킹, 오프라인 배너 이벤트 전환 및 `axe` WCAG 접근성 테스트 통과

## 참고 자료(선택)
- GitHub 이슈: #104
- 웹앱 매니페스트 및 서비스 워커: `public/manifest.webmanifest`, `public/sw.js`
- PWA 캐싱 전략 및 수명주기 매니저: `src/lib/pwa.ts`
- 오프라인 감지 인디케이터 배너: `src/components/common/OfflineStatusBanner.tsx`
- 단위 테스트: `tests/pwa.test.tsx`

