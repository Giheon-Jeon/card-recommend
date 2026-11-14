# Issue #117: 실적 D-Day 소비 팁의 미도달 구간 혜택률 안내 및 날짜 검증 누락

## 배경 및 원인
1. **미도달 상위 구간 혜택률 과장 안내 (QA-004)**: `extractBenefitsFromCard`가 카드의 모든 `tiers` 혜택을 평탄화하여 최고 혜택률을 선택하므로, 1구간(5%) 적용 상태에서 미도달한 2구간(20%) 기준의 과장된 예상 혜택이 안내되었습니다.
2. **월 한도 0원 무제한 오인식 (QA-008)**: `capPerMonth` 비교 및 예상 혜택 상한 적용 시 `capPerMonth ?` 및 `|| 999999` 같은 falsy 체크를 사용하여 한도가 `0`원인 혜택이 무제한으로 계산되었습니다.
3. **기준일 유효성 검증 누락 (QA-009)**: `calculateRemainingDaysInMonth`에서 `currentDate ?` 조건으로 `0`(Unix epoch)을 무시하고, `Date` 파싱 실패(`NaN`) 시 검증 없이 `말일 D-NaN`을 반환했습니다.

## 해결 내용
- **`src/lib/performanceDday.ts`**
  - `selectTargetTierBenefits`를 도입하여 `tierIndex` 또는 `currentSpend`에 해당하는 적용 구간(미전달/미달 시 가장 낮은 기본 구간)의 혜택만 추출하도록 개선했습니다.
  - `capPerMonth !== undefined` 명시적 비교를 적용해 월 한도가 `0`원인 혜택의 예상 혜택을 `0`원으로 처리하고 정렬 우선순위에서도 정확히 `0`으로 취급하도록 수정했습니다.
  - `calculateRemainingDaysInMonth`에서 `currentDate !== undefined && currentDate !== null` 및 `Number.isNaN(parsedDate.getTime())` 검증을 추가해 유효하지 않은 날짜 입력 시 현재 시각으로 안전하게 대체하도록 했습니다.
- **`src/components/catalog/PerformanceProgressTracker.tsx`**
  - `getPerformanceDdayInfo` 호출 시 `currentSpend`를 전달하여 사용자의 현재 실적 구간에 맞는 소비 팁이 표시되도록 연결했습니다.
- **`tests/performanceDday.test.ts`**
  - QA-004, QA-008, QA-009 재현 및 회귀 방지 단위 테스트를 추가했습니다.
