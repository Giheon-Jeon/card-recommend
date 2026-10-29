---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드별 연회비 청구월 및 유효기간 관리와 갱신/해지 알림 D-Day 트래커"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
담아둔 내 카드별로 발급월, 연회비 청구월, 유효기간(MM/YY)을 등록해두고, 연회비 청구 30일 전 알림 및 카드의 실질 가치(연간 순혜택이 연회비보다 높은지)를 대조해 갱신/해지 여부 판단을 돕습니다.

## 작업 상세 내용
- [x] 내 카드(`MyCardItem`) 스키마에 발급월(`issuedMonth`), 연회비 청구월(`annualFeeMonth`), 유효기간 필드 확장 (`src/lib/myCards.ts`)
  - `MyCardMeta` 및 `MyCardItem` 인터페이스 정의 (`sourceId`, `issuedMonth`, `annualFeeMonth`, `expiryDate`)
  - `normalizeIssuedMonth`(`YYYY-MM`), `normalizeAnnualFeeMonth`(`1~12`), `normalizeExpiryDate`(`MM/YY`, `YYYY-MM`, `MMYY` -> `MM/YY`) 정규화 함수 구현
  - 기존 `number[]` 로컬 스토리지 및 백업 JSON과 호환되는 `migrateMyCardsData` 마이그레이션 함수 구현
  - `useMyCards` 훅에 `items`, `getCardMeta`, `updateCardMeta` 제공 및 발급월 입력 시 청구월 자동 추론 지원
- [x] 연회비 청구 D-Day 및 유효기간 만료 계산, 갱신/해지 손익 분석 유틸리티 구현 (`src/lib/annualFeeTracker.ts`)
  - `calculateAnnualFeeDday`: 연회비 청구월(1~12) 기준 차기 청구일(해당 월 1일) D-Day 및 30일 이내 임박(`isUrgent`) 경고 메시지 산출
  - `calculateExpiryDday`: 유효기간(`MM/YY`) 말일 기준 만료 D-Day, 만료 임박(`dDay <= 60`) 및 만료 여부 계산
  - `evaluateCardRenewalDecision`: 카드별 월 사용액 및 실적 충족 여부를 반영한 연간 예상 누적 혜택과 연회비를 비교하여 `'유지 권장'`(`keep`) vs `'해지/교체 검토'`(`review`) 의사결정 지표 산출
- [x] 내 카드 타일 내 발급/청구월 인라인 입력 및 청구 임박(D-30 이내) 경고 뱃지, 의사결정 보조 위젯 제공 (`src/components/catalog/MyCardsPage.tsx`)
  - 카드 타일 내 발급월(`type="month"`), 청구월(`1~12월 select`), 유효기간(`MM/YY`) 인라인 입력 UI 구현
  - 연회비 청구 D-30 이내 카드에 `⚠️ 연회비 청구 D-N` 경고 뱃지(`data-testid="annual-fee-urgent-badge"`), 하단 알림 박스(`data-testid="annual-fee-urgent-alert"`), 상단 컨트롤 바 요약 카운트(`data-testid="overview-urgent-fee-count"`) 표시
  - 연간 예상 혜택·연회비·연간 순혜택 비교 및 `'유지 권장'` / `'해지/교체 검토'` 뱃지를 제공하는 갱신/해지 의사결정 보조 위젯(`data-testid="renewal-decision-widget"`) 추가
- [x] 스키마 마이그레이션 하위 호환성 유지 및 테스트 검증 (`tests/myCards.test.ts`, `tests/annualFeeTracker.test.ts`, `tests/MyCardsPage.test.tsx`)
  - 기존 `number[]` 형식 로컬 스토리지 및 백업 파일 하위 호환성과 `MyCardItem` 스키마 마이그레이션 검증
  - 연회비 D-30 경계값, 연도 이월, 유효기간 만료 및 손익분기 기반 유지/해지 판정 단위 테스트 통과
  - `MyCardsPage` 인라인 입력, D-30 경고 뱃지, 의사결정 위젯 전환 및 `axe` WCAG 접근성 검증 통과

## 참고 자료(선택)
- GitHub 이슈: #103
- 내 카드 스키마 및 스토리지 훅: `src/lib/myCards.ts`
- 연회비 D-Day 및 갱신/해지 손익 분석 유틸: `src/lib/annualFeeTracker.ts`
- 내 카드 보관함 페이지: `src/components/catalog/MyCardsPage.tsx`
- 단위 테스트: `tests/myCards.test.ts`, `tests/annualFeeTracker.test.ts`, `tests/MyCardsPage.test.tsx`

