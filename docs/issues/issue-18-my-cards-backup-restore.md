---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 관심 카드(내 카드) 저장/관리 및 JSON 백업·복원 시스템"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 보유 중이거나 관심 있는 카드를 '내 카드'로 담아두고 혜택 시뮬레이션 및 비교의 우선 대상으로 활용할 수 있도록 지원하며, 기기 변경이나 브라우저 초기화 시에도 데이터를 유지할 수 있는 JSON 파일 백업 및 불러오기(병합/덮어쓰기) 기능을 구현합니다.

## 작업 상세 내용
- [x] 브라우저 `localStorage` 기반 내 카드(ID 배열) 영구 저장 및 탭 간 실시간 동기화 훅 구현 (`src/lib/myCards.ts`)
- [x] 카드 담기(`add`), 제거(`remove`), 토글(`toggle`), 전체 비우기(`clear`) 액션 구현
- [x] 내 카드 관리 전용 페이지(`MyCardsPage.tsx`) 및 카드사별 통계 그리드 UI 구현
- [x] 내 카드 목록 JSON 파일 다운로드(내보내기) 기능 구현
- [x] 백업 JSON 파일 유효성 검증(스키마 검사) 및 기존 목록과의 병합(merge) / 덮어쓰기(overwrite) 지원
- [x] 내 카드 관리 훅 및 백업/복원 로직 단위 테스트 작성 (`tests/myCards.test.ts`, `tests/MyCardsPage.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #68
- `src/lib/myCards.ts`, `src/components/catalog/MyCardsPage.tsx`
