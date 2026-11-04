# Issue #115: [BUG] 카탈로그 카드 변환 시 정액 할인 혜택률 100% 초과 및 키워드 오탐

## 1. 개요
- **관련 이슈**: `#115` (`CA-001`, `CA-002`, `CA-003`, `QA-002`)
- **목적**:
  1. 카탈로그 정액 할인 혜택을 비율로 환산할 때 혜택률이 100%를 초과하여 지출 금액보다 큰 혜택이 계산되는 문제를 해결합니다.
  2. `"KTX"` 키워드에서 통신(`"KT"`) 혜택이 오탐 생성되는 부분 문자열 매칭 문제를 해결합니다.
  3. 혜택 요약에서 구체적 혜택을 찾지 못해 기본 0.7% 혜택이 부여된 카드(`443장`)를 식별하여 전체 추천 순위 왜곡을 방지합니다.

## 2. 주요 변경 사항
1. **정액 할인 혜택 모델링 개선 및 환산 비율 상한 제한 (`src/types/card.ts`, `src/lib/cardConverter.ts`)**:
   - `Benefit` 인터페이스에 `fixedPerUse`, `usesPerMonth`, `isFallback` 필드를 추가하고 `Card` 인터페이스에 `hasFallbackBenefitOnly` 필드를 추가했습니다.
   - `X원당 Y원` 형태의 할인/적립 구문을 우선 파싱하고, 정액 할인의 기준 금액을 합리화했으며 모든 환산 비율의 상한을 `Math.min(rate, 1)` 이하로 제한했습니다.
2. **카탈로그 변환 키워드 단어 경계 매칭 적용 (`src/lib/cardConverter.ts`)**:
   - `matchesCategoryKeyword` 헬퍼를 적용하여 `"KT"`, `"CU"`, `"SSG"` 등 영문 약어 키워드에 단어 경계(`(?<![A-Za-z])...(?![A-Za-z])`) 및 부분 문자열 오탐 예외를 적용했습니다 (`"KTX"`에서 `"mobile"` 혜택이 생성되는 오탐 해결).
3. **혜택 한도 불변식(`benefitAmount <= spend`) 보장 및 기본 혜택 카드 분리 (`src/lib/benefitCalculator.ts`, `src/lib/portfolioRecommender.ts`, `src/lib/recommender.ts`, `src/components/SimulatorPage.tsx`, `src/components/CardList.tsx`)**:
   - `evaluateCard`, `estimateMonthlyBenefitFromCard`, `evaluateCombination`에서 혜택 금액이 지출액을 초과하지 않도록 `Math.min(cappedByMonth, spend)` 불변식을 보장했습니다.
   - 기본 0.7% 혜택만 부여된 카드를 전체 카드 추천 대상에서 제외하고, `rankCards` 및 `bestCardPerCategory`에서 실제 혜택 보유 카드보다 후순위로 배치하며 UI에 `기본 0.7% 추정` 배지를 표시하도록 개선했습니다.
4. **QA-002 재현 테스트 및 카탈로그 전체 속성 테스트 추가 (`tests/cardConverter.test.ts`, `tests/benefitCalculator.test.ts`, `tests/recommender.test.ts`)**:
   - `sourceId: 59` 재현 테스트(`QA-002`)와 카탈로그 전체 1,449장 대상 `rate <= 1` 및 `benefitAmount <= spend` 속성 테스트를 추가했습니다.
