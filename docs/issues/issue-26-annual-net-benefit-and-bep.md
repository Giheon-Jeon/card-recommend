---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 상세 및 비교 모달 내 연회비 회수 분기점(Break-even) 및 연간 순혜택 지표 제공"
labels: 'enhancement, ui'
assignees: 'Giheon-Jeon'
---

## 기능 설명
현재 월 예상 혜택과 연회비가 별도 항목으로 단순 나열되어 있어 사용자가 실제 1년 동안 얻게 되는 순수 혜택(연간 총 혜택 - 연회비)과 연회비를 회수하는 데 걸리는 기간(손익분기점)을 직관적으로 비교하기 어렵습니다. 카드 상세 모달 및 2~3종 비교 모달에 연회비 회수 소요 개월 수 및 1년 순혜택 지표를 시각화하여 카드의 실질 가치를 명확히 제시합니다.

## 작업 상세 내용
- [x] 연간 순혜택 계산 함수 구현: `(월간 예상 혜택 * 12) - 국내외 기본 연회비` (`src/lib/benefitCalculator.ts`)
- [x] 손익분기점(BEP) 소요 기간 계산 로직 구현: `연회비 / 월간 예상 혜택` (월 단위 환산 및 1개월 미만 회수 시 '당월 회수' 표기) (`src/lib/benefitCalculator.ts`)
- [x] `CardDetailModal` 혜택 요약 섹션에 '연간 예상 순혜택' 및 '연회비 회수 시점' 뱃지/카드 추가 (`src/components/catalog/CardDetailModal.tsx`)
- [x] `CardComparisonModal` 비교표에 연회비 대비 순혜택 비교 행 추가 및 카드 간 우위 하이라이트 표시 (`src/components/catalog/CardComparisonModal.tsx`)
- [x] 연회비 0원(체크카드 등)일 경우 '연회비 없음(즉시 혜택)' 분기 처리 (`src/lib/benefitCalculator.ts`, `CardDetailModal.tsx`, `CardComparisonModal.tsx`)
- [x] 계산 로직 유닛 테스트 및 상세/비교 모달 렌더링 테스트 작성 (`tests/benefitCalculator.test.ts`, `tests/CardDetailModal.test.tsx`, `tests/CardComparison.test.tsx`, `tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #88
- 혜택 계산 모듈: `src/lib/benefitCalculator.ts`
- 상세/비교 모달: `src/components/catalog/CardDetailModal.tsx`, `src/components/catalog/CardComparisonModal.tsx`
