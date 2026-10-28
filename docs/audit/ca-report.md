# CA 감사 보고서 (코드·보안·공급망·CI)

- 기준: `main@4ea331e` (작업 브랜치 `Giheon-Jeon/fireworm`), 2026-10-28
- 범위: `src/**`, `data/**`, `package.json`, `package-lock.json`, `vite.config.ts`, `.github/**` (읽기 전용)
- 이 보고서 외 파일은 수정하지 않았다. 재현 테스트는 `docs/audit/qa-report.md`에 있다.

## 1. 요약

| 심각도 | 건수 |
|---|---|
| Critical | 0 |
| High | 4 |
| Medium | 5 |
| Low | 2 |
| Info | 2 |
| **합계** | **13** |

핵심 결론
- 원격 악용이나 API Key 유출에 해당하는 Critical 항목은 없다. 런타임 의존성 `npm audit` 결과는 0건이다.
- 추천 결과의 정확도 문제가 가장 크다. 카탈로그 → `Card` 변환(`cardConverter.ts`)이 정액 할인을 비율로 바꾸면서 **100%를 넘는 혜택률**(최대 333%)을 만든다. 키워드 부분 문자열 매칭은 **엉뚱한 카테고리 혜택**을 만든다. 카탈로그에 전월실적 데이터가 없어서 실적 트래커는 모든 카드에 **같은 기본 구간**을 보여 준다.
- CI에 타입체크·빌드 게이트가 없다. CD는 빌드 실패를 삼키기 때문에 항상 성공으로 표시된다.

## 2. 발견 항목

### [CA-001] 정액 할인을 비율로 환산할 때 혜택률이 100%를 넘는다
- 심각도: High
- 위치: src/lib/cardConverter.ts:271-291
- 근거: 정액 금액을 고정 기준액으로 나눈다. 교통 기준액은 1,500원이다.
  ```ts
  let baseAmount = 10000;
  if (matchedCategory === "transport") {
    baseAmount = 1500;
  } ...
  rate = avgWon / baseAmount;
  ```
  카탈로그 1,449장 전체를 변환해 측정했다. 혜택률 50% 이상인 혜택이 **51건**, 최대값은 **333%**다(sourceId 59 `삼성카드 taptap I`, "KTX/SRT 5,000원 할인" → transport rate 3.33). 이 카드에 대중교통 3,000원을 쓰면 혜택이 10,000원으로 계산된다(`capped: false`). 혜택이 지출보다 크다.
- 영향: 교통·통신처럼 지출이 적은 카테고리에서 혜택이 부풀려져 `rankCards`·포트폴리오 순위가 왜곡된다. "1회 5,000원 할인"류 카드가 상위로 올라간다.
- 권고: 비율을 `min(rate, 1)` 이하로 제한하는 것만으로는 부족하다. 정액 할인은 `Benefit`에 별도 타입(예: `fixedPerUse`, `usesPerMonth`)으로 모델링해야 한다. 최소한 `benefitAmount ≤ spend`라는 불변식을 `evaluateCard`에서 보장한다.
- 관련: QA-002

### [CA-002] 키워드 부분 문자열 매칭이 엉뚱한 카테고리를 만든다
- 심각도: High
- 위치: src/lib/importerParser.ts:16-18, src/lib/importerParser.ts:125-131, src/lib/cardConverter.ts:230-236
- 근거: `clause.toLowerCase().includes(keyword.toLowerCase())`로 부분 문자열을 비교한다.
  - `mobile`의 `"KT"`가 `"KTX"`에 걸린다. sourceId 59의 "KTX/SRT 5,000원 할인"에서 **mobile 10% 혜택**이 추가로 생성됐다(실측: `["mobile",0.1,10000]`).
  - `mart`의 `"마트"`가 `"스마트스토어"`에 걸린다. `parseTextLocally("스마트스토어 29,000원")`은 `category: "mart"`를 반환한다(실측).
  - `"CU"`, `"KT"`, `"SSG"`처럼 짧은 영문 키워드는 대소문자 무시와 결합되어 오탐 범위가 넓다.
- 영향: 카드에 실제로 없는 통신비 혜택이 생기고, 가져온 지출이 잘못된 카테고리로 분류된다. 두 경우 모두 추천 결과가 틀린다.
- 권고: 영문 약어 키워드에는 단어 경계(`\bKT\b`, `(?<![A-Z])KT(?![A-Z])`)를 적용한다. `"마트"`처럼 일반어에 포함되는 키워드는 예외 목록(`스마트`)이나 우선순위가 더 높은 키워드(`스마트스토어` → onlineShopping)를 둔다. 오탐 사례를 테이블 기반 테스트로 고정한다.
- 관련: QA-001(같은 파서), QA-002

### [CA-003] 카탈로그에 전월실적 데이터가 없어 실적 구간이 전부 기본값이다
- 심각도: High
- 위치: data/catalog/cards-catalog.json(필드 부재), src/lib/performanceTracker.ts:38-42, src/lib/performanceTracker.ts:85-90, src/lib/cardConverter.ts:340-345
- 근거: `performanceStandard` 필드를 가진 항목이 **0/1449**다(`grep -c performanceStandard` = 0). 따라서 `getCardPerformanceTiers`는 모든 카드에 신용 `[300000, 700000, 1000000]` 또는 체크 `[200000, 500000, 800000]` 두 가지 중 하나만 반환한다(실측). 화면에는 "추정"이라는 표시가 없다. 같은 이유로 `catalogEntryToCard`는 모든 카드를 `minSpend: 0`으로 만들고, `benefitSummary`에서 혜택을 하나도 찾지 못한 **443장(30.6%)**에는 임의의 0.7% 기본 혜택을 넣는다.
- 영향: "내 카드" 실적 트래커, D-Day 일평균 권장액, 미달/달성 집계가 실제 카드 조건과 무관한 값을 보여 준다. 시뮬레이터는 실적 조건을 전혀 반영하지 않는다.
- 권고: (1) `scripts/fetchCardCatalog.ts`에서 전월실적 문구를 수집한다. (2) 그 전까지는 기본 구간을 쓸 때 UI에 "카드사 기준 미확인 · 일반 구간 예시"라고 표시한다. (3) 기본 0.7% 혜택을 받은 카드는 순위 계산에서 제외하거나 별도로 표시한다.
- 관련: QA-004

### [CA-004] 개발 의존성 High 취약점 3건 (vite, happy-dom, source-map-js)
- 심각도: High (공급망)
- 위치: package.json(devDependencies), package-lock.json
- 근거: `npm audit` 결과 high 3건, moderate 3건이다. `npm audit --omit=dev` 결과는 0건이다.
  - `vite 8.2.0-8.2.2`: 개발 서버 cross-origin script execution, `server.fs.allow` 우회, launch-editor 명령 주입(Windows)
  - `happy-dom 17.0.0-21.0.3`: import alias 미정제로 인한 호스트 코드 실행(GHSA-834v-8h66-3h79). 테스트 환경에서 사용한다.
  - `source-map-js ≤1.2.1`: event-loop DoS
- 영향: 배포 번들에는 포함되지 않는다. 다만 개발자 PC의 `npm run dev`와 CI 러너가 공격 표면이다. 이 저장소의 개발 환경은 Windows이므로 launch-editor 항목도 해당된다.
- 권고: 별도 PR에서 `vite ≥8.2.3`, `happy-dom ≥21.0.4`(메이저 변경이므로 테스트 회귀 확인 필요)로 올린다. 이번 작업에서는 규칙에 따라 `npm audit fix`를 실행하지 않았다.
- 관련: CA-005

### [CA-005] CI에 타입체크·빌드·감사 게이트가 없다
- 심각도: Medium
- 위치: .github/workflows/ci.yml:36-50
- 근거: CI는 `lint`, `lint:a11y`, `test:coverage`만 실행한다. `vitest`는 타입을 검사하지 않으므로 `tsc -b` 실패가 main에 들어갈 수 있다. `npm ci || npm install`은 lockfile 불일치를 `npm install`로 덮는다. 커버리지 임계값(`coverage.thresholds`)과 `npm audit` 단계도 없다.
- 영향: 타입 오류, lockfile 드리프트, 커버리지 하락, 신규 취약점이 PR 단계에서 걸러지지 않는다.
- 권고: `npx tsc -b`와 `npm run build` 단계를 추가하고, `npm ci` 실패 시 바로 실패시킨다. `vite.config.ts`에 `coverage.thresholds`(현재 기준선 Lines 81 / Branches 74)를 두고, `npm audit --omit=dev --audit-level=high`를 추가한다. `actions/setup-node`의 `cache: 'npm'`도 활성화한다(lockfile이 있다).
- 관련: CA-006

### [CA-006] CD가 빌드 실패를 삼키고, Node 18로 빌드한다
- 심각도: Medium
- 위치: .github/workflows/cd.yml:14, .github/workflows/cd.yml:36-44
- 근거: 매트릭스에 `18.x`가 있다. `vite@8`의 `engines`는 `^20.19.0 || >=22.12.0`이다. 빌드 단계는 `npm run build || echo "No build script found"`라서 실패해도 성공으로 끝난다. Deploy 단계는 `echo`만 한다.
- 영향: CD 상태가 항상 초록이므로 "배포 가능" 신호로 쓸 수 없다. Node 18 빌드가 깨져도 드러나지 않는다.
- 권고: 매트릭스를 CI와 같은 `20.x, 22.x`로 맞추고 `|| echo`를 제거한다. 실제 배포 대상이 없다면 워크플로 이름을 "Build check"로 바꾸거나 배포 단계를 제거한다.

### [CA-007] 혜택 계산 캐시 키가 실제 계산 입력과 다르다
- 심각도: Medium
- 위치: src/lib/benefitCalculator.ts:37-47, src/lib/benefitCalculator.ts:7-10, src/lib/benefitCalculator.ts:77-87
- 근거: 캐시 키는 `val > 0`인 값만 직렬화한다. 반면 `calculateQualifyingSpend`는 음수를 합산한다. 따라서 `{cafe:400000}`과 `{cafe:400000, etc:-200000}`이 같은 키를 쓴다. 실측: 캐시 사용 시 실적 인정 400,000원과 `meetsMinimum: true`, 캐시 미사용 시 200,000원과 `false`. 카드 키도 `card.id`만 쓰므로, 같은 id에서 연회비나 혜택이 바뀌면 이전 결과가 그대로 반환된다(실측: 연회비 0 → 120,000원으로 바꿔도 순혜택 20,000원이 그대로 나옴).
- 영향: 현재 UI 경로(`useSpendingProfile`)는 음수를 0으로 보정하므로 바로 발현되지는 않는다. 하지만 `setSpending`(무보정), 외부 호출, 향후 카드 편집 기능에서 틀린 추천을 조용히 반환한다.
- 권고: 키 직렬화와 계산의 입력 정규화를 같은 함수로 통일한다(예: 계산 전에 음수를 0으로 정규화). 카드 키에는 내용 해시나 버전을 포함한다.
- 관련: QA-003

### [CA-008] 포트폴리오가 도달할 수 없는 상위 구간 혜택률로 배분한다
- 심각도: Medium
- 위치: src/lib/portfolioRecommender.ts:21-37, src/lib/portfolioRecommender.ts:138-144, src/lib/portfolioRecommender.ts:174-192
- 근거: `getCardBestBenefit`은 모든 tier 중 최대 혜택률을 고른다. 실제 배분 후에는 도달한 tier로 다시 평가한다. 하지만 그 tier에 해당 카테고리 혜택이 없으면 `assignment.rate`가 상위 tier 값으로 남는다. 실측: cafe가 "혜택률 0.2, 예상 혜택 0원"으로 배정됐다.
- 영향: 공유 텍스트와 배분표에 "혜택률 20.0%, 예상 혜택 +0원"처럼 모순된 정보가 표시된다. 배분 자체도 상위 구간 기준이라 최적이 아니다.
- 권고: 배분 단계에서 카드별 예상 실적으로 도달 가능한 tier의 혜택률을 쓴다. 최종 평가에서 혜택이 없으면 `rate`를 0으로 갱신한다.
- 관련: QA-006

### [CA-009] 접근성: 문서 언어 오지정, API 키 팝오버 대화상자 시맨틱 누락
- 심각도: Medium
- 위치: index.html:2, src/components/ApiKeySettings.tsx:57-60
- 근거: UI가 모두 한국어인데 `<html lang="en">`으로 지정되어 있다. API 키 팝오버는 `role` 없는 `<div aria-label=...>`이라 aria-label이 무시된다. Escape 닫기와 포커스 이동도 없다. 다른 모달(`CardDetailModal`, `MerchantRulesModal`)은 `aria-modal`과 Escape를 지원한다.
- 영향: 스크린리더가 한국어를 영어 발음 규칙으로 읽는다. 키보드 사용자가 팝오버를 닫거나 경계를 인지하기 어렵다. `oxlint -D jsx-a11y`는 이 두 가지를 잡지 못한다(index.html은 대상 외).
- 권고: `lang="ko"`로 바꾼다. 팝오버에 `role="dialog"`, 열릴 때 입력창 포커스, Escape 닫기, 닫힐 때 트리거 버튼으로 포커스 복귀를 적용한다.

### [CA-010] Gemini 원문 응답을 콘솔에 기록하고 카테고리를 검증하지 않는다
- 심각도: Low
- 위치: src/lib/importerParser.ts:298-306, src/lib/cardAdvice.ts:94
- 근거: 파싱 실패 시 `console.error("Gemini Response parsing failed:", responseText, error)`를 호출한다. `responseText`에는 사용자의 결제 내역과 영수증 내용이 들어 있다. 응답의 `category`는 `String(item.category || "etc")`로 받기만 하고 허용 목록과 대조하지 않는다.
- 영향: 공용 PC나 확장 프로그램 환경에서 지출 내역이 콘솔에 남는다. 이미지 내 문구로 유도된 비정상 카테고리는 `applyImportedItems`에서 etc로 흡수되지만, 미리보기 표에는 그대로 표시된다.
- 권고: 원문 대신 길이나 해시만 로깅한다. 카테고리는 `categories.json`의 id 목록으로 검증하고, 금액은 유한 정수인지 확인한다.

### [CA-011] GitHub Actions 권한·버전 고정 미설정
- 심각도: Low
- 위치: .github/workflows/ci.yml, .github/workflows/cd.yml
- 근거: `permissions:` 블록이 없어 기본 토큰 권한을 사용한다. 액션이 태그(`@v4`)로 참조되어 있다.
- 영향: 서드파티 액션이 침해되었을 때 영향 범위가 넓다.
- 권고: 워크플로 최상단에 `permissions: contents: read`를 두고, 액션은 커밋 SHA로 고정한다(Dependabot으로 갱신).

### [CA-012] CSP 부재 (API 키를 웹 스토리지에 보관하는 구조)
- 심각도: Info
- 위치: index.html
- 근거: Content-Security-Policy가 없다. Gemini 키는 session/localStorage에 저장된다. 이 위험은 `docs/gemini-api-key-security-review.md`에서 이미 다루고 있다. 현재 코드에서 `dangerouslySetInnerHTML`, `eval`, `new Function` 사용은 0건이다(grep 확인).
- 영향: 향후 XSS가 생기면 키 탈취로 이어진다. 현재 확인된 XSS 경로는 없다.
- 권고: 배포 환경 헤더나 meta 태그로 `script-src 'self'`, `connect-src 'self' https://generativelanguage.googleapis.com`을 적용한다. index.html의 인라인 테마 스크립트는 hash로 허용한다.

### [CA-013] 연말정산 소득공제 모델은 근사치이므로 기준 확인이 필요하다
- 심각도: Info
- 위치: src/lib/taxDeductionCalculator.ts:63-67, src/lib/taxDeductionCalculator.ts:89-104
- 근거: 총급여 25% 문턱을 카드별 지출에 각각 적용한다. 실제로는 전체 카드 사용액 합산에 적용되고, 문턱은 신용카드 사용분부터 차감된다. 한계세율은 총급여를 과세표준으로 간주해 계산한다. 공제 한도 구간(1.2억 초과 200만원)이 현행 세법 기준과 맞는지는 이번 감사에서 확인하지 못했다.
- 영향: 카드별 절세액과 "절세 포함 피킹률"이 실제와 다를 수 있다.
- 권고: 화면에 "단일 카드 사용 가정 근사치"라고 명시한다. 한도 구간은 최신 조세특례제한법 기준으로 재확인한다.

## 3. 요청 변경 (범위 밖이라 손대지 않은 것)

| 대상 | 요청 | 관련 |
|---|---|---|
| src/lib/cardConverter.ts | 정액 할인 모델링, 혜택 ≤ 지출 불변식 | CA-001 |
| src/lib/importerParser.ts, src/lib/cardConverter.ts | 키워드 경계 매칭, 오탐 예외 | CA-002 |
| scripts/fetchCardCatalog.ts, data/catalog | 전월실적 문구 수집 | CA-003 |
| src/components/catalog/PerformanceProgressTracker.tsx | 기본 구간 사용 시 "미확인" 표시 | CA-003 |
| package.json, package-lock.json | vite·happy-dom 상향 (별도 PR) | CA-004 |
| .github/workflows/ci.yml | tsc/build/audit 단계, `npm ci` 단독 사용 | CA-005 |
| vite.config.ts | `coverage.thresholds` 추가 | CA-005 |
| .github/workflows/cd.yml | Node 매트릭스 수정, `|| echo` 제거 | CA-006 |
| src/lib/benefitCalculator.ts | 캐시 키와 입력 정규화 통일 | CA-007 |
| src/lib/portfolioRecommender.ts | 도달 가능 tier 기준 배분, rate 갱신 | CA-008 |
| index.html, src/components/ApiKeySettings.tsx | `lang="ko"`, dialog 시맨틱 | CA-009 |
| src/lib/importerParser.ts, src/lib/cardAdvice.ts | 원문 로깅 제거, 카테고리 검증 | CA-010 |

## 4. 측정 결과

| 명령 | 결과 |
|---|---|
| `npm run lint` | 통과 |
| `npm run lint:a11y` | 통과 (index.html `lang`은 검사 대상 아님) |
| `npx tsc -b` | 통과 (exit 0) |
| `npm audit` | high 3 (vite, happy-dom, source-map-js), moderate 3 (vitest 체인) |
| `npm audit --omit=dev` | 0건 |
| `grep -c performanceStandard data/catalog/cards-catalog.json` | 0 |
| 카탈로그 변환 실측 (임시 프로브, 미커밋) | 1,449장 · rate ≥ 50% 혜택 51건 · 최대 rate 3.333 · 기본 0.7%만 받은 카드 443장 · 실적 구간 종류 2개 |
| `grep -rn "dangerouslySetInnerHTML\|eval(\|new Function" src` | 0건 |
| Node | 로컬 v22.20.0 / vite engines `^20.19.0 \|\| >=22.12.0` |
