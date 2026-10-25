---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 영수증 이미지 다중 일괄 업로드(Batch OCR) 및 순차 분석 진행률 큐(Queue) 시스템"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
영수증 이미지를 1장씩 올리는 번거로움을 해소하기 위해 여러 장(최대 10장)을 한 번에 드래그앤드롭하여 업로드하고, Gemini API Rate Limit 방지를 위한 비동기 순차 처리(Sequential Batch) 파이프라인을 통해 개별 진행 상태를 시각화합니다. 다중 영수증 파싱 결과를 하나의 검토 테이블에서 일괄 취합하고, 동일 가맹점 및 동일 금액의 중복 의심 항목을 자동으로 감지하여 사용자가 손쉽게 검토·정리할 수 있도록 지원합니다.

## 작업 상세 내용
- [x] 영수증 다중 파일 업로드 드롭존 및 이미지 썸네일 대기 큐(Queue) 상태 관리 (`src/components/SpendingImporter.tsx`, `src/lib/batchReceiptOcr.ts`)
  - 드롭존 `multiple` 속성 지원 및 다중 드래그앤드롭 이벤트 처리
  - 최대 10장 한도 제어 및 초과 시 안내 메시지 반환 (`validateBatchFiles`)
  - 개별 이미지 유효성 검사(JPG/PNG/WebP/HEIC 포맷 및 최대 10MB 크기 검증)
  - 썸네일 대기 큐 그리드 렌더링, 파일명·용량 표기, 개별 삭제 및 전체 비우기 지원
- [x] Gemini API Rate Limit 방지를 위한 비동기 순차 처리(Sequential Batch) 파이프라인 구현 (`src/lib/batchReceiptOcr.ts`)
  - 대기 큐 항목별 순차 처리 루프 및 요청 간 완충 딜레이(`delayMs`) 적용
  - 처리 상태 4단계(`pending` | `processing` | `completed` | `error`) 상태 전이 관리
  - 개별 실패 건 발생 시 전체 중단 없이 다음 영수증 분석 지속 수행
  - 진행 중 사용자 취소를 위한 `AbortSignal` 연동
- [x] 파싱 진행률 프로그레스 바 및 실패 건 개별 재시도 버튼 제공 (`src/components/SpendingImporter.tsx`)
  - 전체 분석 진행률(예: 3/5 완료, 60%) 및 현재 분석 중인 파일명 실시간 시각화
  - 실패한 영수증에 대한 인라인 `[재시도]` 버튼 제공 (`retryBatchReceiptItem`)
  - 체험용 데모 탭에 다중 영수증(3장) 일괄 분석 및 중복 감지 인터랙티브 데모 추가
- [x] 파싱 완료된 다중 영수증 항목의 `ParsedItemsTable` 자동 병합 및 중복 검사 (`src/components/ParsedItemsTable.tsx`, `src/types/importer.ts`)
  - 다중 영수증 지출 항목 통합 및 동일 가맹점+금액 기반 중복 감지 엔진 (`mergeAndDeduplicateItems`)
  - `ParsedItemsTable` 내 중복 의심 경고 배너 및 항목별 `중복 의심` 배지 표시
  - 중복 의심 항목 원클릭 일괄 선택 및 선택 삭제 지원
- [x] 단위 테스트 및 컴포넌트 통합 테스트 작성
  - 다중 파일 큐 유효성 검사, 순차 실행, 에러 건너뜀 및 재시도, 중복 감지 단위 테스트 (`tests/batchReceiptOcr.test.ts`)
  - 다중 파일 업로드 드롭존, 썸네일 큐, 한도 초과 및 데모 탭 통합 테스트 (`tests/SpendingImporter.test.tsx`)
  - 중복 의심 배너 및 일괄 선택 연동 테스트 (`tests/ParsedItemsTable.test.tsx`)
  - WAI-ARIA 접근성 검증 및 린트 검증 0건 통과 (`oxlint`, `npm run lint:a11y`)

## 참고 자료(선택)
- GitHub 이슈: #99
- 큐 및 순차 처리 모듈: `src/lib/batchReceiptOcr.ts`
- 지출 입력 컴포넌트: `src/components/SpendingImporter.tsx`
- 검토 테이블 컴포넌트: `src/components/ParsedItemsTable.tsx`
- 타입 정의: `src/types/importer.ts`
- 단위 테스트: `tests/batchReceiptOcr.test.ts`, `tests/SpendingImporter.test.tsx`, `tests/ParsedItemsTable.test.tsx`
