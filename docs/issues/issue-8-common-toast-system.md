---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Refactor] 알림/토스트 공통 시스템 구축 및 전역 UI 일관성 확보"
labels: 'refactor, enhancement'
assignees: ''
---

## 기능 설명
`MyCardsPage`, `ParsedItemsTable`, `ApiKeySettings`, `SpendingImporter` 등 각 화면마다 개별적으로 선언되어 중복 구현된 알림/토스트 상태 관리와 피드백 렌더링 로직을 전역 `ToastContext` 및 `useToast` 훅으로 통합합니다.

## 작업 상세 내용
- [x] 전역 `ToastProvider` 및 `useToast` 훅 구현 (`success`, `error`, `info`, `warning` 타입 지원)
- [x] WAI-ARIA 접근성 가이드 준수 (`role="alert"`, `role="status"`, `aria-live="polite"`)
- [x] 개별 화면(`MyCardsPage`, `ParsedItemsTable`, `ApiKeySettings`)의 자체 토스트 로직을 공통 훅으로 전환
- [x] 토스트 표시, 자동 타이머 소멸, 닫기 인터랙션 단위 테스트 작성

## 참고 자료(선택)
- GitHub 이슈: #46
- `src/components/catalog/MyCardsPage.tsx`, `src/components/ParsedItemsTable.tsx`
