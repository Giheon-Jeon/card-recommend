---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카테고리별 지출 비중 및 카드별 혜택 기여도 시각화 인터랙티브 차트(도넛/바) 대시보드"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
텍스트와 숫자 중심의 시뮬레이터 및 포트폴리오 추천 결과를 순수 SVG 기반 경량 도넛 차트(카테고리별 지출 비율) 및 스택 바 차트(카드별 혜택 기여도)로 시각화하여 한눈에 지출 구조와 카드별 혜택 기여 수준을 직관적으로 파악할 수 있도록 돕습니다. 외부 무거운 서드파티 라이브러리(Recharts, Chart.js 등) 없이 가볍고 빠른 반응형 SVG 차트로 구현하여 번들 크기를 최적화하고 다크 모드 및 WAI-ARIA 웹 접근성을 완벽히 준수합니다.

## 작업 상세 내용
- [x] 순수 SVG 기반 반응형 도넛 차트 컴포넌트 구현 (`src/components/charts/DonutChart.tsx`)
  - 중심점과 반지름 기반 정밀 SVG 아크 패스(`d`) 수학적 계산
  - 단일 항목 100% 선택 시 360도 풀 서클(Full Circle) 아크 자동 분할 처리
  - 세그먼트 마우스 호버 및 키보드 포커스 인터랙션(확대 및 하이라이트)
  - 중앙 서머리 영역(총 월 지출 및 호버 카테고리 실시간 정보) 지원
  - 카테고리별 범례(Legend) 칩 그리드 및 토글/호버 연동
- [x] 순수 SVG 기반 반응형 스택 바 차트 컴포넌트 구현 (`src/components/charts/StackedBarChart.tsx`)
  - 1000px 기준 SVG 뷰박스 및 SVG `clipPath` 기반 부드러운 양끝 둥근 모서리 처리
  - 카드별 혜택 기여도 누적 세그먼트 비율 및 호버 활성화 뱃지 표시
  - 카드별 세부 요약 범례(카드명, 카드사, 담당 카테고리, 기여액, 비율) 연동
- [x] 차트 웹 접근성(WAI-ARIA) 및 다크 모드 완벽 연동
  - SVG 루트 엘리먼트 `role="img"` 및 상세 `aria-label` 부여
  - 개별 세그먼트 `role="graphics-symbol"`, 키보드 `tabIndex={0}`, Enter/Space 키 지원
  - 스크린 리더 사용자를 위한 숨김 대체 데이터 테이블(`<table className="sr-only">`) 내장
  - Tailwind 다크 모드(`dark:`) 테마 및 카테고리별/카드별 고대비 테마 색상 팔레트 상수화 (`src/components/charts/chartTypes.ts`)
- [x] SpendingSimulator 카테고리별 지출 비중 도넛 차트 대시보드 연동 (`src/components/SpendingSimulator.tsx`)
  - 실시간 입력 금액 반영 및 차트 보기/숨기기 토글 버튼 제공
  - 도넛 차트 세그먼트와 카테고리별 슬라이더 카드 간의 양방향 호버 인터랙션(포커스 링 강조) 연동
- [x] PortfolioRecommendation 카드별 혜택 기여도 스택 바 차트 업그레이드 (`src/components/PortfolioRecommendation.tsx`)
  - 2장 및 3장 최적 포트폴리오 조합에 맞춘 카드별 월간 혜택 기여도 시각화
  - 차트 세그먼트와 카테고리별 추천 결제 카드 배분표 행 간의 호버 인터랙션 연동
- [x] 단위 테스트 및 접근성 검증 (`tests/charts.test.tsx`, `tests/SpendingSimulator.test.tsx`, `tests/PortfolioRecommendation.test.tsx`, `tests/a11y.test.tsx`)
  - DonutChart 빈 데이터 상태, 아크 렌더링, 범례 및 중앙 서머리 인터랙션 테스트
  - StackedBarChart 누적 비율 계산, 호버 활성화 뱃지, 범례 인터랙션 테스트
  - SpendingSimulator 차트 접기/펼치기 토글 및 지출 합계 다중 요소 검증
  - WAI-ARIA 접근성 검증 및 린트 검증 0건 통과 (`oxlint`, `npm run lint:a11y`)

## 참고 자료(선택)
- GitHub 이슈: #100
- 순수 SVG 차트 모듈: `src/components/charts/`
  - `src/components/charts/DonutChart.tsx`
  - `src/components/charts/StackedBarChart.tsx`
  - `src/components/charts/chartTypes.ts`
  - `src/components/charts/index.ts`
- 지출 시뮬레이터 컴포넌트: `src/components/SpendingSimulator.tsx`
- 포트폴리오 추천 컴포넌트: `src/components/PortfolioRecommendation.tsx`
- 단위 테스트: `tests/charts.test.tsx`, `tests/SpendingSimulator.test.tsx`, `tests/PortfolioRecommendation.test.tsx`
