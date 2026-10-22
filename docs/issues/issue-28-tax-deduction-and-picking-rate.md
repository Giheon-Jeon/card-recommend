---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 연말정산 소득공제(신용 15% vs 체크 30%) 절세 환급액 및 피킹률(Picking Rate) 분석 엔진"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
신용카드(15%)와 체크카드(30%)의 소득공제율 차이 및 총급여 25% 초과 문턱을 반영하여, 단순 할인액을 넘어 연말정산 절세 환급액까지 합산한 실질 혜택과 소비 대비 혜택 비율(피킹률)을 제공합니다. 사용자의 연봉 수준에 따라 체크카드 사용이 유리해지는 분기점을 도출하고, 전체 카드 및 내 카드 추천 시 종합 실질 체감 혜택을 극대화합니다.

## 작업 상세 내용
- [x] 연봉/총급여 및 25% 기본 공제 문턱 기반 소득공제 계산 엔진 (`src/lib/taxDeductionCalculator.ts`) 구현
- [x] 카드별·카테고리별 실질 피킹률(Picking Rate = 총 혜택 / 총 결제액 %) 산출 로직 구현
- [x] 시뮬레이터 결과 화면에 '소득공제 절세 반영' 토글 및 피킹률 지표 뱃지 연동 (`src/components/RecommendationResult.tsx`)
- [x] 시뮬레이터 페이지(`SimulatorPage.tsx`)의 월 총 지출액을 추천 결과 컴포넌트에 연동
- [x] 소득공제 및 피킹률 계산 단위 테스트 작성 (`tests/taxDeductionCalculator.test.ts`, 11건 통과)
- [x] 추천 결과 UI 피킹률 및 소득공제 인터랙션 단위 테스트 보강 (`tests/RecommendationResult.test.tsx`, 6건 통과)

## 참고 자료(선택)
- GitHub 이슈: #96
- 계산 엔진: `src/lib/taxDeductionCalculator.ts`
- 추천 결과 UI: `src/components/RecommendationResult.tsx`
- 조세특례제한법 제126조의2 (신용카드 등 사용금액에 대한 소득공제)
