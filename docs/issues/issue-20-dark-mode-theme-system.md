---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 다크 모드(Dark Mode) 테마 시스템 및 시스템 설정(OS) 실시간 동기화"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자 시각적 피로도를 경감하고 모던한 UI 경험을 제공하기 위해 `light`, `dark`, `system` 3가지 테마 모드를 지원하는 전역 테마 상태 관리 시스템과 새로고침 시 깜빡임(FOUC) 방지 스크립트 및 OS 다크 모드 실시간 동기화를 구현합니다.

## 작업 상세 내용
- [x] 전역 `ThemeProvider` 및 `useTheme` 커스텀 훅 구현 (`src/contexts/ThemeContext.tsx`)
- [x] OS `prefers-color-scheme` 미디어 쿼리 감지 및 시스템 테마 실시간 동기화
- [x] 브라우저 `localStorage`('theme-mode') 영구 저장 및 재방문 시 테마 복원
- [x] 첫 화면 렌더링 전 인라인 스크립트를 통한 화면 깜빡임(FOUC) 원천 차단 (`index.html`)
- [x] 헤더 3단 세그먼트 테마 토글 버튼 UI 및 WAI-ARIA 접근성 속성 적용 (`src/components/common/ThemeToggle.tsx`)
- [x] Tailwind CSS v4 다크 모드 스타일 토큰 정의 및 주요 화면 다크 테마 적용 (`src/index.css`, `src/App.tsx`)
  - 카드 비교 서랍(`CardComparisonDrawer.tsx`) 및 비교 모달(`CardComparisonModal.tsx`) 다크 테마 적용
  - 내 카드 관리 페이지(`MyCardsPage.tsx`) 및 백업 모달 다크 테마 적용
  - 카드 갤러리(`CatalogGallery.tsx`), 카드 타일(`CatalogCardTile.tsx`), 상세 모달(`CardDetailModal.tsx`) 다크 테마 적용
- [x] 테마 모드 전환 및 미디어 쿼리 이벤트 감지 단위 테스트 작성 (`tests/ThemeContext.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #70
- `src/contexts/ThemeContext.tsx`, `src/components/common/ThemeToggle.tsx`, `src/index.css`
