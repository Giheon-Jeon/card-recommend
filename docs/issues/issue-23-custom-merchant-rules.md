---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 가맹점-카테고리 자동 분류 규칙(사전) 커스텀 관리 기능"
labels: 'enhancement, refactor'
assignees: 'Giheon-Jeon'
---

## 기능 설명
현재 CSV/텍스트 파서에 정적으로 하드코딩되어 있는 가맹점 키워드 분류 규칙을 사용자가 직접 확인하고, 자주 이용하는 동네 마트, 개인 카페, 특정 가맹점명이 '기타'로 분류되지 않도록 사용자가 직접 키워드-카테고리 매핑 규칙을 등록·수정·관리(localStorage 영구 저장)할 수 있는 기능을 구축합니다.

## 작업 상세 내용
- [x] 사용자 정의 가맹점 분류 룰(키워드 -> 카테고리 매핑) 저장 및 불러오기 유틸리티 함수 구현 (`src/lib/merchantRules.ts`)
- [x] `csvSpendingParser` 및 `importerParser`에서 기본 내장 룰과 사용자 커스텀 룰을 병합하여 우선 매칭하도록 리팩토링 (`src/lib/csvSpendingParser.ts`, `src/lib/importerParser.ts`)
- [x] `SpendingImporter` 내 가맹점 분류 규칙 관리 모달 또는 설정 UI 추가 (`src/components/MerchantRulesModal.tsx`, `src/components/SpendingImporter.tsx`)
- [x] 분류 규칙 추가/수정/삭제 시 토스트 알림 연동 및 유효성 검사 (빈 키워드 방지, 50자 제한, 중복 방지 등)
- [x] 규칙 백업 및 초기화(기본값 복원) 기능 제공 (`downloadMerchantRulesBackup`, `parseAndValidateMerchantRulesBackup`)
- [x] 파서 및 UI 관련 유닛 테스트 작성 (`tests/merchantRules.test.ts`, `tests/MerchantRulesModal.test.tsx`, `tests/importerCustomRules.test.ts`, `tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #85
- 파서 구현체: `src/lib/csvSpendingParser.ts`, `src/lib/importerParser.ts`
- 업로더 컴포넌트: `src/components/SpendingImporter.tsx`
