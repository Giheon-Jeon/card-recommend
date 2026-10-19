---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 내 카드별 전월 실적 달성 현황 및 구간별 달성률(Progress) 트래커"
labels: 'enhancement, ui'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 '내 카드'에 등록해 둔 실제 보유 카드들이 이번 달 지출 총액 기준으로 최소 실적 기준(예: 30만원) 및 최적 혜택 구간(예: 70만원, 100만원)을 달성했는지 직관적으로 파악할 수 있는 실적 달성 현황 게이지(Progress Bar) 및 다음 실적 구간까지 남은 금액 안내 위젯을 제공합니다.

## 작업 상세 내용
- [x] 카드별 `performanceStandard` (전월 실적 조건) 데이터를 파싱하여 실적 구간 배열로 추출하는 헬퍼 함수 구현 (`src/lib/performanceTracker.ts`)
- [x] 사용자의 시뮬레이터 입력 총액 또는 수동 월 사용액 입력에 기반한 카드별 실적 달성률 계산 로직 구현 (`src/lib/performanceTracker.ts`, `src/components/catalog/MyCardsPage.tsx`)
- [x] `MyCardsPage` 카드 목록 타일 내 실적 달성 상태 뱃지(미달성/달성/최대혜택) 및 진행바(Progress) UI 추가 (`src/components/catalog/PerformanceProgressTracker.tsx`, `src/components/catalog/MyCardsPage.tsx`)
- [x] 다음 혜택 구간까지 남은 금액 안내 문구 렌더링 (예: '다음 혜택 구간까지 120,000원 남음')
- [x] 다크 모드 및 WAI-ARIA `role="progressbar"`, `aria-valuenow` 표준 접근성 준수 (`PerformanceProgressTracker.tsx`)
- [x] 유닛 테스트 및 UI 렌더링 테스트 작성 (`tests/performanceTracker.test.ts`, `tests/PerformanceProgressTracker.test.tsx`, `tests/MyCardsPage.test.tsx`, `tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #87
- 내 카드 페이지: `src/components/catalog/MyCardsPage.tsx`
- 카드 데이터 모델: `src/types/card.ts`, `src/types/catalog.ts`
