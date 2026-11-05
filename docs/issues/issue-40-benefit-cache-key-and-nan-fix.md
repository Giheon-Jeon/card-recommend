# Issue #116: [BUG] 혜택 계산 캐시 키 불일치 및 NaN 지출 처리 오류

## 1. 개요
- **관련 이슈**: `#116` (`CA-007`, `QA-003`, `QA-007`)
- **목적**:
  1. 지출 프로필에 음수 금액이 포함될 때 캐시 키 직렬화와 실적·혜택 계산 입력이 불일치하여 캐시 여부에 따라 서로 다른 결과가 반환되는 문제를 해결합니다.
  2. 동일한 카드 ID를 유지한 채 연회비나 혜택 조건이 변경될 때 이전 캐시가 그대로 반환되는 문제를 해결합니다.
  3. `NaN` 또는 비유한(`Infinity`) 지출 금액이 유입될 때 혜택 합계가 `NaN`으로 전파되어 추천 순위 정렬이 깨지는 문제를 방지합니다.

## 2. 주요 변경 사항
1. **지출 금액 입력 정규화 및 캐시 키 직렬화 통일 (`src/lib/benefitCalculator.ts`)**:
   - `Number.isFinite` 및 양수(`> 0`) 검사 기반의 `normalizeSpendAmount`와 `normalizeSpendingProfile` 함수를 추가했습니다.
   - `serializeSpendingProfile`, `calculateQualifyingSpend`, `evaluateCard`에서 동일한 정규화 함수를 사용하여 음수 및 `NaN` 지출을 0으로 정규화하고 캐시 결과와 비캐시 결과의 완전한 일치를 보장했습니다.
2. **카드 캐시 키 시그니처 확장 (`src/lib/benefitCalculator.ts`)**:
   - `serializeCardCacheKey` 함수를 도입하여 카드 ID(`id`)뿐만 아니라 연회비(`annualFee`), 실적 제외 카테고리(`excludedCategories`), 구간별 혜택(`tiers` 내 `minSpend`, `category`, `rate`, `capPerMonth`)을 캐시 키에 포함했습니다.
3. **단위 테스트 보강 (`tests/benefitCache.test.ts`, `tests/benefitCalculator.test.ts`)**:
   - `QA-003` 재현 테스트(`캐시 결과는 캐시 미사용 결과와 같아야 한다`) 및 동일 ID 카드 속성(연회비, 혜택률) 변경 시 캐시 무효화 검증 테스트를 추가했습니다.
   - `QA-007` 재현 테스트(`NaN 지출은 0원으로 취급한다`) 및 `normalizeSpendAmount`, `normalizeSpendingProfile` 단위 테스트를 추가했습니다.
