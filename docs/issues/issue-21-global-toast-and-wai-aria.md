---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Refactor] 전역 알림/토스트 공통 시스템 구축 및 WAI-ARIA 접근성 강화"
labels: 'enhancement, refactor'
assignees: 'Giheon-Jeon'
---

## 기능 설명
각 화면 컴포넌트마다 산재되어 있던 알림 UI를 일원화된 전역 토스트 시스템으로 통합하고, 스크린 리더와 키보드 전용 사용자를 위해 WAI-ARIA 명세 준수 및 키보드 네비게이션(포커스 트랩, ESC 닫기)을 전면 적용하여 접근성 품질을 고도화합니다.

## 작업 상세 내용
- [x] 전역 `ToastProvider` 및 `useToast` 훅 구현 (`success`, `error`, `info`, `warning` 지원) (`src/contexts/ToastContext.tsx`)
- [x] 토스트 컴포넌트 WAI-ARIA 접근성 속성(`role="alert"`, `role="status"`, `aria-live="polite"`) 적용
- [x] 모달 컴포넌트 키보드 조작 지원(ESC 닫기, 탭 키 포커스 트랩, 모달 오픈 시 배경 스크롤 방지)
- [x] `axe-core` 기반 WCAG 2.1 접근성 자동화 스캐너 테스트 스위트 구축 (`tests/a11y.test.tsx`)
- [x] `oxlint -D jsx-a11y` 린트 규칙 검사 통과 및 접근성 보고서 문서화 (`docs/accessibility-scanner-report.md`)

## 참고 자료(선택)
- GitHub 이슈: #71
- `src/contexts/ToastContext.tsx`, `tests/a11y.test.tsx`, `docs/accessibility-scanner-report.md`
