---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 다중 카드 최적 조합(포트폴리오 2~3장) 추천 알고리즘 및 시각화"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
1장의 카드 사용을 넘어 실생활에서 2~3장의 카드를 목적별(대중교통/통신 특화, 카페/외식 특화 등)로 조합하여 결제할 때 총 순혜택을 극대화하는 '최적 2~3장 카드 포트폴리오 조합' 추천 알고리즘과 직관적인 시각화 UI를 제공합니다.

## 작업 상세 내용
- [x] 다중 카드 조합 순혜택 계산 및 카테고리별 담당 카드 배분 알고리즘 구현 (`src/lib/portfolioRecommender.ts`)
- [x] 분할 지출 기준 카드별 실질 전월실적 충족 여부(`meetsMinimum`) 및 한도/연회비 차감 연산
- [x] 상위 후보군 선별 및 사전 혜택 캐싱(`ratesLookup`)을 통한 100ms 이내 초고속 연산 보장
- [x] 2장/3장 포트폴리오 전환 탭 및 단일 1위 대비 추가 이득 금액 배지 렌더링 (`src/components/PortfolioRecommendation.tsx`)
- [x] 카드별 월간 혜택 기여도 가로 분할 바 차트 및 카테고리별 추천 결제 배분 가이드표 렌더링
- [x] 추천 조합 카드를 원클릭으로 '내 카드'에 일괄 담는 액션 버튼 연동
- [x] 포트폴리오 추천 알고리즘 및 시각화 컴포넌트 단위 테스트 작성 (`tests/portfolioRecommender.test.ts`, `tests/PortfolioRecommendation.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #66
- `src/types/portfolio.ts`, `src/lib/portfolioRecommender.ts`, `src/components/PortfolioRecommendation.tsx`
