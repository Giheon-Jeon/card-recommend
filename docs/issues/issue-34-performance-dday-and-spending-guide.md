---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 전월 실적 마감 D-Day 카운트다운 및 부족 실적 채우기 소비 추천 가이드"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
월말이 다가올 때 목표 실적까지 얼마가 남았는지(예: 마감 D-5, 실적 75,000원 부족)를 직관적으로 알리고, 잔여 일수 기준 일평균 권장 소비액 및 해당 카드의 최고 적립/할인 카테고리에서 소비하여 추가 혜택을 극대화하면서 실적을 채울 수 있는 스마트 소비 추천 가이드를 제공합니다.

## 작업 상세 내용
- [x] 당월 잔여 일수(D-Day) 및 일평균 권장 소비액, 최고 혜택 카테고리 추출 유틸리티 구현 (`src/lib/performanceDday.ts`)
  - 당월 말일 기준 잔여 일수(D-Day), 오늘 포함 소비 가능 일수(`daysRemaining`) 계산 및 마감 임박(`dDay <= 5`) 플래그 산출
  - 부족 실적 기준 잔여 일수 일평균 권장 소비액(`dailyRecommendedSpend`, 원 단위 올림) 계산
  - `CatalogEntry` 및 `Card` 객체의 혜택을 분석하여 최고 혜택률 카테고리 자동 추출 및 예상 혜택/한도 고려 추천 팁(`SpendingTip`) 메시지 생성
  - 종합 가이드 정보 헬퍼(`getPerformanceDdayInfo`) 제공
- [x] `PerformanceProgressTracker`에 '말일 D-N' 뱃지, 일평균 권장액 및 부족 실적 하이라이트 추가 (`src/components/catalog/PerformanceProgressTracker.tsx`)
  - 실적 미달성(`unmet`) 또는 다음 실적 구간이 있는(`met`) 카드에 대해 '말일 D-N' 뱃지 노출 (D-5 이하 임박 시 펄스 애니메이션 적용)
  - 마감까지 남은 일수 기준 일평균 권장 소비액 하이라이트 박스(`data-testid="performance-daily-spend-highlight"`) 제공
  - 해당 카드의 최고 혜택 카테고리에서 실적을 채우도록 안내하는 소비 팁 박스(`data-testid="spending-recommendation-tip"`) 표시
  - 실적 달성 완료(`max`) 또는 실적 조건 없음(`none`)인 경우 불필요한 D-Day 부족 안내 자동 제외
- [x] 내 카드 보관함(`MyCardsPage.tsx`) 연동
  - 카드 보관함 목록의 `PerformanceProgressTracker`에 각 카드의 `CatalogEntry` 정보를 전달하여 카드별 맞춤형 소비 팁 노출
- [x] 단위 테스트 및 접근성 검증 (`tests/performanceDday.test.ts`, `tests/PerformanceProgressTracker.test.tsx`)
  - 월 중간(10/15), 말일 임박(10/28), 말일 당일(10/31), 윤년/평년 2월 말일 계산 및 D-Day 라벨 검증
  - 일평균 권장 소비액(부족액 75,000원/4일 -> 18,750원, 올림 처리 및 0원 보정) 검증
  - 최고 적립/할인 카테고리 추출, 월 한도 초과 방지 및 팁 메시지 생성 검증
  - `PerformanceProgressTracker`의 D-Day 뱃지, 일평균 권장액, 소비 팁 컴포넌트 렌더링 및 `axe` WCAG 접근성 검증 통과
  - 전체 43개 테스트 파일 459개 테스트 ALL PASS 및 `oxlint` 0건 통과

## 참고 자료(선택)
- GitHub 이슈: #102
- 실적 마감 D-Day 및 소비 팁 유틸: `src/lib/performanceDday.ts`
- 실적 추적 프로그레스 바 컴포넌트: `src/components/catalog/PerformanceProgressTracker.tsx`
- 내 카드 보관함 페이지: `src/components/catalog/MyCardsPage.tsx`
- 단위 테스트: `tests/performanceDday.test.ts`, `tests/PerformanceProgressTracker.test.tsx`
