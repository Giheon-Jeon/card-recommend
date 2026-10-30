---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 파워 유저를 위한 전역 키보드 단축키 네비게이션 및 단축키 안내 헬프 모달"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
마우스 없이도 키보드로 핵심 작업을 초고속으로 수행할 수 있도록 전역 단축키(탭 전환, 검색창 포커스, 비교함 토글, 지출 슬라이더 조절 등)를 지원하고, `?` 키를 누르면 단축키 도움말 모달을 표시합니다.

## 작업 상세 내용
- [x] 전역 단축키 이벤트 리스너 훅 (`src/hooks/useGlobalShortcuts.ts`) 구현
  - `SHORTCUT_DEFINITIONS` 및 카테고리(`navigation`, `action`, `general`) 정의
  - `1`/`2`/`3`(탭 전환), `/`(카드 검색창 포커스), `c`(비교 모달 토글), `?`(단축키 도움말 모달 토글), `Esc`(모달 닫기 및 입력창 포커스 해제) 핸들러 연결
  - `Ctrl`, `Alt`, `Meta` 조합 키 무시 및 `isEditableElement`를 통한 `input`, `textarea`, `select`, `contenteditable` 포커스 시 단축키 충돌 방지
- [x] 단축키 헬프 다이얼로그 모달 컴포넌트(`src/components/KeyboardShortcutsModal.tsx`) 제작 및 접근성 준수
  - `<dialog aria-modal="true">` 기반 시맨틱 모달, `Tab` 포커스 트랩, 이전 포커스 복원, 배경 스크롤 잠금 구현
  - 카테고리별 단축키 목록 및 `<kbd>` 뱃지 UI 렌더링
- [x] `App.tsx` 및 `CatalogGallery.tsx` 전역 네비게이션 연동
  - 상단 헤더에 단축키 안내 오픈 버튼(`data-testid="open-shortcuts-modal-btn"`) 추가
  - 다른 탭에서 `/` 또는 `c` 입력 시 자동으로 갤러리 탭으로 전환 후 검색창 포커스 또는 비교 모달 토글 수행
- [x] 입력 폼(`input`, `textarea`) 포커스 시 단축키 충돌 방지 및 단위 테스트 작성 (`tests/keyboardShortcuts.test.tsx`)
  - `isEditableElement`, `useGlobalShortcuts`, `KeyboardShortcutsModal`, `App` 통합 시나리오 및 `axe` WCAG 접근성 검증 통과

## 참고 자료(선택)
- GitHub 이슈: #105
- 전역 단축키 훅: `src/hooks/useGlobalShortcuts.ts`
- 단축키 도움말 모달: `src/components/KeyboardShortcutsModal.tsx`
- 메인 앱 및 카탈로그 연동: `src/App.tsx`, `src/components/catalog/CatalogGallery.tsx`
- 단위 테스트: `tests/keyboardShortcuts.test.tsx`
