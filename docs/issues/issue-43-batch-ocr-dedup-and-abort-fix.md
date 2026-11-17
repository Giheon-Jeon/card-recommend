# Issue #119: 영수증 일괄 OCR 중복 표시 및 중단 시 결과 유실

## 배경 및 원인
1. **중복 항목 마킹 시 원본 포함 (QA-005)**: `mergeAndDeduplicateItems`가 키별 출현 횟수(`count > 1`)로 판별해 첫 번째 원본 항목까지 `isDuplicate: true`로 마킹했습니다. 이로 인해 중복 건수가 과다 집계되고 일괄 선택 삭제 시 원본 내역까지 함께 삭제되는 문제가 있었습니다.
2. **지연(`sleep`) 중 중단 시 완료 결과 유실 (QA-010)**: `processReceiptBatchSequentially`에서 항목 간 `sleep(delayMs, signal)` 대기 중 `AbortController.abort()`가 호출되면 `sleep`이 reject되면서 함수 전체가 예외로 종료되어 기 완료된 영수증 결과까지 화면에 반영되지 못하고 유실되었습니다.

## 해결 내용
- **`src/lib/batchReceiptOcr.ts`**
  - `mergeAndDeduplicateItems`가 `Set`을 사용해 키별 첫 번째 출현 항목은 `isDuplicate: false`로 유지하고, 두 번째 이후 출현 항목부터 `isDuplicate: true` 및 `duplicateCount`에 집계하도록 수정했습니다.
  - `processReceiptBatchSequentially`의 `sleep(delayMs, signal)` 호출부를 `try/catch`로 감싸 `signal?.aborted`에 의한 중단 시 루프를 `break`하고 기 완료된 부분 결과를 정상 반환하도록 개선했습니다.
- **`tests/batchReceiptOcr.test.ts`**
  - 기존 중복 감지 테스트의 기대값을 실제 중복 건수(첫 항목 제외)로 동기화하고 `QA-005`, `QA-010` 재현 테스트를 추가했습니다.
