---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 지출 파싱 결과 미리보기 검토 테이블 및 인라인 편집/요약 시스템"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
영수증 OCR 또는 CSV 명세서로 파싱된 지출 항목들을 시뮬레이터에 적용하기 전에 사용자가 직접 검토하고 가맹점명, 카테고리, 금액을 인라인으로 수정하거나 항목을 추가/삭제할 수 있는 반응형 검토 테이블을 제공합니다.

## 작업 상세 내용
- [x] 파싱 항목 인라인 텍스트 및 카테고리 셀렉트 박스 편집 기능 구현 (`src/components/ParsedItemsTable.tsx`)
- [x] 새 지출 항목 직접 추가(+ 행 추가) 및 개별 삭제 인터랙션 구현
- [x] 체크박스 기반 다중 선택 및 선택 항목 일괄 삭제 기능 지원
- [x] 총 파싱 건수, 총 금액, 환불/취소 내역 실시간 요약 배너 렌더링
- [x] 최종 검토 완료 데이터를 지출 시뮬레이터 카테고리별 지출 프로필에 원클릭 반영
- [x] 검토 테이블 조작, 유효성 검사, 시뮬레이터 반영 단위 테스트 작성 (`tests/ParsedItemsTable.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #64
- `src/types/importer.ts`, `src/components/ParsedItemsTable.tsx`
