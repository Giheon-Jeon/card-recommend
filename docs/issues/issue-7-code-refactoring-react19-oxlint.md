---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Refactor] React 19 렌더링 최적화 및 oxlint 경고 해소를 위한 컴포넌트 리팩토링"
labels: 'refactor'
assignees: ''
---

## 기능 설명
`oxlint` 실행 시 발생하는 3건의 경고(`set-state-in-effect` 2건, `only-export-components` 1건)를 해결하고, 불필요한 연쇄 렌더링(cascading renders) 및 Fast Refresh 이슈를 방지하여 React 19 환경에 최적화된 상태 흐름 구조로 리팩토링합니다.

## 작업 상세 내용
- [x] `src/components/catalog/CardDetailModal.tsx`: `useEffect` 내 `setImgError(false)` 동기 호출을 렌더링 단계 파생 또는 `key` 속성 기반 리셋으로 리팩토링
- [x] `src/components/SpendingImporter.tsx`: `useEffect` 내 `setApiKey` 동기 호출 제거 및 `useGeminiApiKey` 컨텍스트 직접 바인딩 구조로 개선
- [x] `src/contexts/GeminiApiKeyContext.tsx`: Vite Fast Refresh 준수를 위해 커스텀 훅(`useGeminiApiKey`) 및 인터페이스 분리
- [x] 기존 19개 테스트 파일의 무결성 검증 및 린트 경고 0건(Clean) 달성

## 참고 자료(선택)
- GitHub 이슈: #45
- `src/components/catalog/CardDetailModal.tsx`, `src/components/SpendingImporter.tsx`, `src/contexts/GeminiApiKeyContext.tsx`
