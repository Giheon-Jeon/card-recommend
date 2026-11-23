# Issue #123: 카드 전월실적 데이터 수집 및 기본 실적 구간 '미확인' 표시

## 배경 및 원인
- `scripts/fetchCardCatalog.ts`가 카탈로그 수집 시 전월실적(`performanceStandard`) 문구를 수집하지 않아, `getCardPerformanceTiers`가 대부분의 카드에 카드 유형별 임의 기본 구간(신용 30/70/100만원, 체크 20/50/80만원)을 적용했습니다 (`CA-003`).
- `PerformanceProgressTracker`에서 기본 실적 구간을 표시할 때 실제 카드사 공식 기준인지 추정 예시인지 구분 표시가 없어 사용자가 오해할 수 있었습니다.

## 해결 내용
- **`scripts/fetchCardCatalog.ts`**
  - `CatalogEntry`에 `performanceStandard?: string` 필드를 추가하고, 상세 페이지 HTML(`<dt>전월실적</dt><dd>...</dd>`, 인라인 텍스트) 및 JSON-LD(`additionalProperty`, `description`)에서 전월실적 문구를 추출하는 `extractPerformanceStandard` 함수를 구현했습니다.
- **`src/lib/performanceTracker.ts`**
  - 카드사 공식 전월실적 기준(무실적 명시 또는 유효 금액 구간) 존재 여부를 판별하는 `hasConfirmedPerformanceStandard` 헬퍼를 추가했습니다.
- **`src/components/catalog/PerformanceProgressTracker.tsx`**
  - `isEstimatedTiers` 선택 prop을 추가하고, 미전달 시에도 `CatalogEntry`의 `performanceStandard` 미확인 여부를 자동 판별하여 기본 구간 사용 시 `"카드사 기준 미확인 · 일반 구간 예시"` 문구를 표시하도록 개선했습니다.
- **`tests/performanceTracker.test.ts`, `tests/PerformanceProgressTracker.test.tsx`**
  - `hasConfirmedPerformanceStandard` 판별 및 미확인 안내 문구 노출/미노출 단위 테스트를 추가했습니다.
