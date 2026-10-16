---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 1인 가구·직장인 등 라이프스타일별 원클릭 소비 지출 프리셋 기능"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 혜택 시뮬레이터에서 10개 카테고리 지출 금액을 매번 0원부터 수동 입력하거나 영수증/CSV를 업로드하지 않고도, 자신의 생활 패턴(1인 가구 자취생, 대중교통 통근 직장인, 카페/쇼핑 매니아, 마트 중심 다인가구, 알뜰 사회초년생 등)에 맞춘 표준 소비 프로필을 원클릭으로 불러와 즉시 최적 카드 추천을 경험할 수 있는 프리셋 선택 기능을 제공합니다.

## 작업 상세 내용
- [x] 대표 라이프스타일별 기본 지출 프로필 데이터셋 정의 (1인 가구, 직장인 통근러, 카페·쇼핑 매니아, 마트 중심 4인가구, 알뜰 사회초년생 등 5종) (`src/lib/spendingPresets.ts`)
- [x] `SpendingSimulator` 상단에 프리셋 선택 퀵 버튼 바 및 정보 뱃지 UI 추가 (`src/components/SpendingPresetSelector.tsx`, `src/components/SpendingSimulator.tsx`)
- [x] 프리셋 선택 시 기존 입력값이 있을 경우 덮어쓰기 확인 대화상자(`<dialog>`) 모달 및 전역 안내 토스트 연동 (`useToast`)
- [x] 프리셋 적용 후 지출 프로필 로컬 스토리지 자동 저장(`writeStoredSpending`) 및 카드 추천 랭킹 실시간 재계산 연동
- [x] 프리셋 컴포넌트 접근성(키보드 네비게이션, WAI-ARIA `aria-pressed`, `aria-label`, 포커스 트랩, ESC 닫기) 및 유닛/UI 테스트 작성 (`tests/spendingPresets.test.ts`, `tests/SpendingPresetSelector.test.tsx`, `tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #84
- 기존 지출 관리 모듈: `src/lib/spendingProfile.ts`
- 시뮬레이터 컴포넌트: `src/components/SpendingSimulator.tsx`, `src/components/SpendingPresetSelector.tsx`
