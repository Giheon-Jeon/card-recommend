---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 월간 소비 지출 시뮬레이터 및 카테고리별 지출 프로필 관리"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 자신의 월간 소비 금액을 카테고리별(대중교통, 카페, 마트, 통신비 등)로 입력하고 시뮬레이션할 수 있는 직관적인 슬라이더/숫자 입력 인터페이스와 입력값을 안전하게 보존하는 영구 상태 관리 시스템을 제공합니다.

## 작업 상세 내용
- [x] 카테고리별 지출 슬라이더(range) 및 수치 입력창, 빠른 입력 버튼(+5만, +10만, +30만 등) UI 구현 (`src/components/SpendingSimulator.tsx`)
- [x] `localStorage` 연동을 통한 지출 프로필 자동 영구 저장 및 복원 훅 구현 (`src/lib/spendingProfile.ts`)
- [x] 지출 금액 전체 초기화 기능 및 동적 슬라이더 최댓값(`getSliderMax`) 보정 로직 구현
- [x] 월 총 지출액 실시간 합산 배너 및 통화 포맷팅(`formatWon`) 연동
- [x] 지출 프로필 관리 및 슬라이더 조작 컴포넌트 단위 테스트 작성 (`tests/spendingProfile.test.ts`, `tests/SpendingSimulator.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #61
- `src/types/card.ts` (`SpendingProfile`, `Category`)
- `src/lib/spendingProfile.ts`, `src/components/SpendingSimulator.tsx`
