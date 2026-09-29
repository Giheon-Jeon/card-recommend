---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드사 결제 내역 CSV 파일 업로드 및 자동 인코딩/카테고리 파싱"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 카드사(신한, 현대, 삼성, KB국민 등) 홈페이지나 앱에서 내려받은 결제 명세서 CSV 파일을 업로드하면, 한글 깨짐 없이 UTF-8 및 EUC-KR(CP949) 인코딩을 자동 감지하고 결제 내역과 승인 취소/환불 건을 카테고리별로 자동 분류합니다.

## 작업 상세 내용
- [x] 브라우저 바이너리 버퍼 기반 UTF-8 및 EUC-KR(CP949) 문자열 자동 디코더 구현 (`src/lib/csvSpendingParser.ts`)
- [x] RFC 4180 호환 CSV 행/열 파서 및 따옴표/이스케이프 처리 구현
- [x] 주요 카드사별 명세서 헤더 자동 감지 및 가맹점/금액/업종 매핑 로직 구현
- [x] 결제 취소 및 부분 환불 내역 음수 금액 변환 처리
- [x] 키워드 및 업종명 사전 기반 소비 카테고리 자동 추론 유틸리티 구현
- [x] 드래그앤드롭 파일 업로드 UI 및 체험용 데모 파싱 기능 추가 (`src/components/SpendingImporter.tsx`)
- [x] CSV 파서 및 파일 업로드 컴포넌트 단위 테스트 작성 (`tests/csvSpendingParser.test.ts`, `tests/SpendingImporter.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #63
- `src/lib/csvSpendingParser.ts`, `src/components/SpendingImporter.tsx`
