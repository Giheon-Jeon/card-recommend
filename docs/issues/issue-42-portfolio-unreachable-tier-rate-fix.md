# Issue #118: 포트폴리오 배분표의 도달 불가 구간 혜택률 표시

## 배경 및 원인
1. **도달 불가 상위 구간 기준 배분 (CA-008, QA-006)**: `getCardBestBenefit`이 카드의 모든 `tiers`에서 최대 혜택률만 조회하므로, 전체 지출을 다 몰아받아도 도달할 수 없는 상위 실적 구간(예: 70만원 구간 20%)을 기준으로 카테고리가 배분되었습니다.
2. **혜택 0원 배정의 모순된 혜택률 표시 (QA-006)**: 배분 후 실적 미달·구간 내 혜택 부재·한도 0원 등으로 실제 혜택이 `0`원일 때 `assignment.rate`를 `0`으로 갱신하지 않아 화면과 공유 텍스트에 "혜택률 20.0%, 예상 혜택 +0원"과 같은 모순된 정보가 표시되었습니다.

## 해결 내용
- **`src/lib/portfolioRecommender.ts`**
  - `getCardBestBenefit`에 `maxQualifyingSpend` 인자를 추가하여, 배분 단계(`evaluateCombination`, `getCandidatePool`, `recommendPortfolios`)에서 카드별 최대 도달 가능 실적 이하의 `tier` 혜택률만 비교하도록 개선했습니다.
  - 최종 평가 시 실적 미달, 해당 `tier` 내 혜택 부재, 또는 한도 적용 후 혜택이 `0`원인 경우 `assignment.rate`를 `0`으로 갱신하도록 수정했습니다.
- **`tests/portfolioRecommender.test.ts`**
  - `maxQualifyingSpend` 기준 도달 불가 구간 제외 테스트, `QA-006`(혜택 0원 배정의 `rate === 0`) 테스트, 도달 가능 구간 기준 배분 테스트를 추가했습니다.
