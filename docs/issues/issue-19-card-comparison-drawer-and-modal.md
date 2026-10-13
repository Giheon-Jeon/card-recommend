---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 관심 카드 2~3종 플로팅 비교함 서랍 및 혜택 비교 모달"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 갤러리 탐색 중 고민 중인 2~3장의 카드를 비교함에 담아 화면 하단 플로팅 서랍으로 확인하고, 한눈에 연회비, 전월실적, 카테고리별 혜택률을 행 단위로 나란히 대조할 수 있는 비교 모달을 제공합니다.

## 작업 상세 내용
- [x] 비교함 상태 관리 및 2~3종 제한 로직을 담은 `useCardComparison` 커스텀 훅 구현 (`src/hooks/useCardComparison.ts`)
- [x] 화면 하단 플로팅 비교함 서랍 UI 구현 (`src/components/catalog/CardComparisonDrawer.tsx`)
- [x] 2~3종 카드 비교 테이블 모달 UI 구현 (`src/components/catalog/CardComparisonModal.tsx`)
  - 카드 기본 스펙(카드사, 유형, 연회비, 최소 실적) 대조 행 렌더링
  - 10개 소비 카테고리별 할인/적립률 및 월 한도 비교 행 렌더링
  - 카테고리별 최고 혜택 카드 강조 배지 표시
- [x] 비교함 추가/제거 시 전역 토스트 피드백 연동
- [x] 비교 훅 및 서랍/모달 컴포넌트 단위 테스트 작성 (`tests/CardComparison.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #69
- `src/hooks/useCardComparison.ts`, `src/components/catalog/CardComparisonModal.tsx`
