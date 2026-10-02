---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 단일 카드 혜택 계산 및 사용자 소비 기준 최적 카드 랭킹 엔진"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 입력한 월 지출 프로필을 바탕으로 카드별 전월실적 산정 제외 카테고리 차감, 전월실적 구간(Tier) 충족 여부 판정, 카테고리별 할인/적립 한도(Cap)를 계산하여 순혜택(월 혜택 - 연회비/12) 기준으로 카드를 정렬하고 최적의 카드 1장과 카테고리별 1순위 카드를 추천하는 엔진을 구축합니다.

## 작업 상세 내용
- [x] 전월실적 인정 금액 계산기(`calculateQualifyingSpend`) 구현 (`src/lib/benefitCalculator.ts`)
- [x] 카드 실적 구간 판정 및 구간별 혜택/월 한도 계산기(`evaluateCard`) 구현
- [x] 순혜택 내림차순 카드 랭킹 함수(`rankCards`) 구현 (`src/lib/recommender.ts`)
- [x] 카테고리별 최고 혜택 카드 매칭 알고리즘(`bestCardPerCategory`) 구현
- [x] 추천 결과 요약 배너 및 카테고리별 카드 매칭 그리드 UI 구현 (`src/components/RecommendationResult.tsx`)
- [x] 혜택 계산 정확도 및 실적 미달 처리 단위 테스트 작성 (`tests/benefitCalculator.test.ts`, `tests/recommender.test.ts`)

## 참고 자료(선택)
- GitHub 이슈: #65
- `src/types/recommendation.ts`, `src/lib/benefitCalculator.ts`, `src/lib/recommender.ts`
