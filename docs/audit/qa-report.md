# QA 감사 보고서 (동작 검증·회귀 테스트)

- 기준: `main@4ea331e` (작업 브랜치 `Giheon-Jeon/chore-ca-qa-audit`), 2026-10-28
- 추가한 파일: `tests/auditRegression.test.tsx` (20개 케이스, 모두 통과)
- 이 보고서의 재현 코드는 **현재 실패하는 기대값**이다. 규칙에 따라 커밋하지 않았고, skip/todo/fails로 우회하지도 않았다. 수정 PR에서 `tests/`에 추가하면 회귀 테스트가 된다.
- "실측"이라고 적은 값은 임시 프로브 테스트(`tests/_probe*.test.ts`, 실행 후 삭제)로 얻은 실제 출력이다. "코드 분석"이라고 적은 항목은 실행으로 재현하지 않았다.

## 1. 요약

| 심각도 | 건수 |
|---|---|
| Critical | 0 |
| High | 2 |
| Medium | 4 |
| Low | 4 |
| Info | 0 |
| **합계** | **10** |

## 2. 발견 항목

### [QA-001] 결제 문자 파싱이 결제금액 대신 누적·잔액 금액을 가져온다
- 심각도: High
- 위치: src/lib/importerParser.ts:44-68
- 근거: 한 줄에서 찾은 금액 중 **마지막 금액**을 쓴다(`amounts[amounts.length - 1]`). 국내 카드사 SMS는 대부분 끝에 `누적` 금액을 붙인다. 실측 결과:

  | 입력 | 결과 |
  |---|---|
  | `신한카드(1234)승인 홍*동 12,000원(일시불)10/28 14:30 스타벅스 누적1,234,567원` | `{merchant:"누적", amount:1234567, category:"cafe"}` |
  | `[Web발신] KB국민카드1*2*승인 홍*동 4,500원 일시불 10/28 09:12 GS25역삼점 누적 523,000원` | `{merchant:"누적", amount:523000, category:"convenience"}` |
  | `현대카드 결제 15,000원 잔액 2,000,000원` | `{merchant:"잔액", amount:2000000, category:"etc"}` |
- 영향: 문자 한 건이 수십~수백 배 금액으로 지출 프로필에 더해진다. 그 결과 추천, 실적 달성, 절세 계산이 모두 틀린다. 가맹점명도 "누적"이나 "잔액"으로 표시된다.
- 재현 테스트: `tests/importerParser.test.ts` › "누적/잔액 금액은 결제금액으로 쓰지 않는다" (아래 코드, 현재 실패)
  ```ts
  it("누적/잔액 금액은 결제금액으로 쓰지 않는다", () => {
    const [item] = parseTextLocally(
      "신한카드(1234)승인 홍*동 12,000원(일시불)10/28 14:30 스타벅스 누적1,234,567원", []);
    expect(item.amount).toBe(12000);
    expect(item.merchant).toBe("스타벅스");
    expect(parseTextLocally("현대카드 결제 15,000원 잔액 2,000,000원", [])[0].amount).toBe(15000);
  });
  ```
- 권고: `누적`, `잔액`, `한도`, `잔여` 바로 뒤에 오는 금액은 후보에서 제외한다. `원` 접미사가 있는 금액을 우선하고, 후보가 여럿이면 승인 키워드에 가장 가까운 금액을 고른다. 가맹점 토큰에서도 같은 단어를 제외한다.
- 관련: CA-002

### [QA-002] 카탈로그 카드 혜택이 지출액을 넘는다
- 심각도: High
- 위치: src/lib/cardConverter.ts:271-291, src/lib/benefitCalculator.ts:98-111
- 근거: 실측. sourceId 59(`삼성카드 taptap I`)를 변환하면 transport rate가 3.333이 된다. `evaluateCard(card, { transport: 3000 })`의 breakdown은 `{spend:3000, benefitAmount:10000, capped:false}`다. 같은 문구 "KTX/SRT 5,000원 할인"에서 `mobile` 10% 혜택도 생성된다.
- 영향: 지출 3,000원에 혜택 10,000원이 계산된다. 카드 순위가 왜곡된다.
- 재현 테스트: `tests/cardConverter.test.ts` › "정액 할인 환산 혜택은 지출을 넘지 않는다" (현재 실패)
  ```ts
  it("정액 할인 환산 혜택은 지출을 넘지 않는다", () => {
    const entry = catalogCards.find((c) => c.sourceId === 59)!;
    const card = catalogEntryToCard(entry);
    for (const b of card.tiers[0].benefits) expect(b.rate).toBeLessThanOrEqual(1);
    expect(card.tiers[0].benefits.some((b) => b.category === "mobile")).toBe(false); // "KTX"≠"KT"
    const r = evaluateCard(card, { transport: 3000 }, false);
    expect(r.breakdown.find((b) => b.category === "transport")!.benefitAmount).toBeLessThanOrEqual(3000);
  });
  ```
- 권고: CA-001과 CA-002의 권고를 따른다. 카탈로그 전체에 대해 `rate ≤ 1`과 `benefitAmount ≤ spend`를 검사하는 속성 테스트를 둔다.
- 관련: CA-001, CA-002

### [QA-003] 음수 지출이 섞이면 캐시가 틀린 결과를 반환한다
- 심각도: Medium
- 위치: src/lib/benefitCalculator.ts:37-47, src/lib/benefitCalculator.ts:77-87
- 근거: 실측. `{cafe:400000}`를 계산한 직후 `{cafe:400000, etc:-200000}`를 계산하면 캐시 결과는 `qualifyingSpend 400000, meetsMinimum true`다. 캐시를 끄면 `200000, false`다. 같은 id로 연회비만 120,000원으로 바꾼 카드도 이전 순혜택(20,000원)을 그대로 받는다.
- 영향: 현재 UI 입력 경로는 음수를 0으로 보정하므로 잠재 결함이다. `setSpending`이나 라이브러리를 직접 호출하면 발현된다.
- 재현 테스트: `tests/benefitCache.test.ts` › "캐시 결과는 캐시 미사용 결과와 같아야 한다" (현재 실패)
  ```ts
  it("캐시 결과는 캐시 미사용 결과와 같아야 한다", () => {
    clearBenefitCache();
    evaluateCard(tiered, { cafe: 400000 });
    const cached = evaluateCard(tiered, { cafe: 400000, etc: -200000 });
    const fresh = evaluateCard(tiered, { cafe: 400000, etc: -200000 }, false);
    expect(cached.qualifyingSpend).toBe(fresh.qualifyingSpend);
  });
  // tiered: tiers [{minSpend:300000, cafe 5%}, {minSpend:700000, cafe 20%}], annualFee 0
  ```
- 권고: CA-007 참조.
- 관련: CA-007

### [QA-004] 실적 채우기 팁이 아직 도달하지 못한 상위 구간 혜택률을 안내한다
- 심각도: Medium
- 위치: src/lib/performanceDday.ts:101-116, src/lib/performanceDday.ts:135-155
- 근거: `extractBenefitsFromCard`가 모든 tier의 혜택을 평탄화한 뒤 최고 혜택률을 고른다. 실측: 1구간 cafe 5%, 2구간 cafe 20%인 카드에서 남은 실적이 100,000원이면 팁은 "20% 할인(약 20,000원)"이다. 이번 달 소비에 실제로 적용되는 비율은 전월 실적으로 결정된 구간(5%)이다.
- 영향: 예상 혜택이 4배로 과장 안내된다.
- 재현 테스트: `tests/performanceDday.test.ts` › "팁은 현재 적용 구간의 혜택률을 쓴다" (현재 실패)
  ```ts
  it("팁은 현재 적용 구간의 혜택률을 쓴다", () => {
    const tip = getRecommendedSpendingTip(tiered, 100000);
    expect(tip?.ratePercent).toBe(5);
    expect(tip?.estimatedBenefit).toBe(5000);
  });
  ```
- 권고: 현재 tier 인덱스(또는 currentSpend)를 인자로 받아 해당 tier 혜택만 고려한다.
- 관련: CA-003

### [QA-005] 중복 의심 항목에 원본까지 표시되어 일괄 삭제 시 둘 다 지워진다
- 심각도: Medium
- 위치: src/lib/batchReceiptOcr.ts:231-243, src/components/ParsedItemsTable.tsx:26-36
- 근거: 실측. 영수증 두 장에 같은 `스타벅스 4,500원`이 있으면 `duplicateCount: 2`, `isDuplicate: [true, true]`이다. `ParsedItemsTable`의 "중복 항목 선택"은 `isDuplicate`인 항목을 모두 선택한다. 이어서 "선택 삭제"를 누르면 원본까지 삭제된다.
- 영향: 중복을 정리하려던 사용자가 정상 지출까지 잃는다. 토스트 문구 "중복 의심 2건"도 실제 중복 수(1건)보다 많다.
- 재현 테스트: `tests/batchReceiptOcr.test.ts` › "같은 키의 첫 항목은 중복으로 표시하지 않는다" (현재 실패)
  ```ts
  it("같은 키의 첫 항목은 중복으로 표시하지 않는다", () => {
    const mk = (id: string): BatchReceiptItem => ({ id, file: new File([""], `${id}.png`),
      previewUrl: "", status: "completed",
      parsedItems: [{ merchant: "스타벅스", amount: 4500, category: "cafe" }] });
    const r = mergeAndDeduplicateItems([mk("r1"), mk("r2")]);
    expect(r.mergedItems.map((m) => m.isDuplicate)).toEqual([false, true]);
    expect(r.duplicateCount).toBe(1);
  });
  ```
- 권고: 키별 첫 출현은 `false`로 두고 두 번째부터 `true`로 표시한다. 기존 `tests/batchReceiptOcr.test.ts`의 기대값도 이 의미로 바꿔야 한다.

### [QA-006] 포트폴리오 배분표에 "혜택률 20%, 혜택 0원"이 함께 표시된다
- 심각도: Medium
- 위치: src/lib/portfolioRecommender.ts:138-144, src/lib/portfolioRecommender.ts:174-192
- 근거: 실측. 1구간 cafe 5%, 2구간 cafe 20%인 카드 T와 dining 10%, cafe 4%인 카드 O로 `{cafe:100000, dining:100000}`를 평가했다. 결과는 `[["cafe","t",0.2,0],["dining","o",0.1,10000]]`이고, 총 혜택은 10,000원이다. T는 2구간(70만원) 기준 20%를 근거로 cafe를 배정받았지만, 실제 배정액 100,000원으로는 1구간(30만원)도 채우지 못한다.
- 영향: 공유 텍스트와 화면에 모순된 수치가 표시된다. 배분 판단도 도달할 수 없는 혜택률을 근거로 하므로 최적이 아닐 수 있다.
- 재현 테스트: `tests/portfolioRecommender.test.ts` › "혜택 0원 배정의 rate는 0이다" (현재 실패)
  ```ts
  it("혜택 0원 배정의 rate는 0이다", () => {
    const p = evaluateCombination([tiered, other], { cafe: 100000, dining: 100000 })!;
    for (const a of p.categoryAssignments) {
      if (a.benefitAmount === 0) expect(a.rate).toBe(0);
    }
  });
  ```
- 권고: CA-008 참조.
- 관련: CA-008

### [QA-007] NaN 지출이 혜택 합계 전체를 NaN으로 만든다
- 심각도: Low
- 위치: src/lib/benefitCalculator.ts:9, src/lib/benefitCalculator.ts:99
- 근거: 실측. `evaluateCard(card, { cafe: NaN, etc: 400000 }, false)`은 `totalMonthlyBenefit NaN`, `netMonthlyBenefit NaN`을 반환한다. 실적 합산(`amount || 0`)은 NaN을 0으로 처리하지만, 혜택 계산(`Math.max(0, NaN)`)은 그렇지 않다.
- 영향: 정렬 비교가 NaN이 되어 순위가 불안정해지고, 화면에 "NaN원"이 표시될 수 있다. UI 입력 경로는 `Math.floor(value || 0)`로 보정한다.
- 재현 테스트: `tests/benefitCalculator.test.ts` › "NaN 지출은 0원으로 취급한다" (현재 실패)
  ```ts
  expect(evaluateCard(tiered, { cafe: NaN, etc: 400000 }, false).totalMonthlyBenefit).toBe(0);
  ```
- 권고: `Number.isFinite` 검사 기반의 공통 정규화 함수를 두고, 실적 합산과 혜택 계산에서 함께 쓴다.

### [QA-008] 월 한도 0원이 팁에서는 "무제한"으로 처리된다
- 심각도: Low
- 위치: src/lib/performanceDday.ts:141, src/lib/performanceDday.ts:152-155
- 근거: 실측. `capPerMonth: 0`, rate 10%인 혜택에 남은 실적 100,000원이면 팁의 `estimatedBenefit`은 10,000원이다. 같은 카드에 대해 `evaluateCard`는 0원을 반환한다. `best.capPerMonth ?`와 `|| 999999`가 0을 falsy로 취급하기 때문이다.
- 영향: 한도가 소진된 혜택을 추천한다.
- 재현 테스트: `tests/performanceDday.test.ts` › "월 한도 0원 혜택은 예상 혜택 0원" (현재 실패)
  ```ts
  const cap0: Card = { ...tiered, tiers: [{ minSpend: 0, benefits: [
    { category: "cafe", type: "discount", rate: 0.1, capPerMonth: 0 }] }] };
  expect(getRecommendedSpendingTip(cap0, 100000)?.estimatedBenefit).toBe(0);
  ```
- 권고: `capPerMonth !== undefined`로 비교한다.

### [QA-009] 잘못된 기준일이면 "말일 D-NaN"이 표시되고, 0은 현재 시각으로 대체된다
- 심각도: Low
- 위치: src/lib/performanceDday.ts:61-81
- 근거: 실측. `calculateRemainingDaysInMonth("invalid")`은 `{dDay:null(NaN), dDayLabel:"말일 D-NaN"}`을 반환한다. `currentDate ? ... : new Date()` 조건 때문에 `0`(epoch)은 오늘 날짜로 처리된다.
- 영향: `currentDate` prop에 잘못된 값이 들어오면 배지가 깨진다.
- 재현 테스트: `tests/performanceDday.test.ts` › "유효하지 않은 기준일은 오늘로 대체한다" (현재 실패)
  ```ts
  expect(calculateRemainingDaysInMonth("invalid").dDayLabel).not.toContain("NaN");
  ```
- 권고: `currentDate !== undefined` 조건으로 판단하고, `Number.isNaN(date.getTime())`이면 현재 시각으로 대체한다.

### [QA-010] 일괄 OCR 중단 시점에 따라 이미 완료된 결과가 사라진다 (코드 분석)
- 심각도: Low
- 위치: src/lib/batchReceiptOcr.ts:98-115, src/lib/batchReceiptOcr.ts:181-184, src/components/SpendingImporter.tsx:395-455
- 근거: 코드 분석이며 실행으로 재현하지 않았다. API 호출 중에 중단하면 루프가 `break` 후 부분 결과를 반환하고, 완료된 항목이 표에 표시된다. 반면 350ms 지연(`sleep`) 중에 중단하면 `sleep`이 reject되어 함수 전체가 예외로 끝난다. 이 경우 `catch`가 "분석 작업이 중단되었습니다." 오류만 표시하고 `setParsedItems`를 호출하지 않는다.
- 영향: 같은 "중단" 동작이 타이밍에 따라 다른 결과를 낸다. 완료된 영수증의 파싱 결과를 다시 분석해야 할 수 있다(API 비용 발생).
- 재현 테스트: `tests/batchReceiptOcr.test.ts` › "지연 중 중단해도 완료된 항목을 반환한다" (현재 실패 예상, 미실행)
  ```ts
  it("지연 중 중단해도 완료된 항목을 반환한다", async () => {
    vi.spyOn(importerParser, "parseWithGemini").mockResolvedValue([{ merchant: "A", amount: 1000, category: "etc" }]);
    const controller = new AbortController();
    const items = [createBatchReceiptItem(new File(["a"], "a.png", { type: "image/png" }), "a"),
                   createBatchReceiptItem(new File(["b"], "b.png", { type: "image/png" }), "b")];
    const p = processReceiptBatchSequentially(items, "key", { delayMs: 1000, signal: controller.signal,
      callbacks: { onItemComplete: () => setTimeout(() => controller.abort(), 0) } });
    const results = await p; // 현재는 reject
    expect(results[0].status).toBe("completed");
  });
  ```
- 권고: `sleep`의 중단 reject를 루프 안에서 잡아 `break`하고 부분 결과를 반환한다.

## 3. 요청 변경 (범위 밖이라 손대지 않은 것)

| 대상 | 요청 | 관련 |
|---|---|---|
| src/lib/importerParser.ts | 누적·잔액 금액 제외, 키워드 경계 매칭 | QA-001 |
| src/lib/cardConverter.ts, src/lib/benefitCalculator.ts | 혜택 ≤ 지출 보장 | QA-002 |
| src/lib/benefitCalculator.ts | 캐시 키·NaN 정규화 통일 | QA-003, QA-007 |
| src/lib/performanceDday.ts | 현재 tier 기준 팁, cap 0 처리, 날짜 검증 | QA-004, QA-008, QA-009 |
| src/lib/batchReceiptOcr.ts, tests/batchReceiptOcr.test.ts | 첫 출현 제외 중복 표시, 지연 중 중단 시 부분 결과 반환 | QA-005, QA-010 |
| src/lib/portfolioRecommender.ts | 도달 가능 tier 기준 배분, rate 갱신 | QA-006 |

위 재현 코드는 해당 수정 PR에서 `tests/`에 함께 추가해야 한다. 이번 작업에서는 실패 테스트를 커밋하지 않는다는 규칙에 따라 보고서에만 남겼다.

## 4. 측정 결과

검증 명령: `npm run lint && npm run lint:a11y && npx tsc -b && npm run test:coverage` → exit 0

| 항목 | 기준선 (4ea331e) | 감사 후 | 차이 |
|---|---|---|---|
| 테스트 파일 | 43 | 44 | +1 |
| 테스트 | 459 | 479 | +20 |
| Statements | 80.36% | 80.72% | +0.36 |
| Branches | 74.29% | 74.69% | +0.40 |
| Functions | 78.38% | 78.51% | +0.13 |
| Lines | 81.14% | 81.46% | +0.32 |

추가한 회귀 테스트 `tests/auditRegression.test.tsx`는 현재 올바르게 동작하는 경계를 고정한다.
- benefitCalculator: 구간 경계값, 제외 카테고리, LRU 축출(기존에 미커버였던 129-131행), 캐시 결과와 비캐시 결과의 일치
- performanceDday: 윤년 2월 말일, 평년 2월, 12월 D-5, 잔여일 0 보정, 카드 미지정
- performanceTracker: 비정렬 구간, 소수·음수·NaN 지출
- csvSpendingParser `parseAmountValue`: 괄호·▲·부분취소·빈값
- myCards 백업: 비정수·0·음수·문자열 ID 거부, 중복 제거
- recommendationShare: execCommand 예외 시 false 반환
- GeminiApiKeyContext: storage 이벤트 동기화 3가지 경로(기존에 미커버였던 43-53행)

모듈별 변화: GeminiApiKeyContext Lines 78.37% → 94.59%, benefitCalculator Lines 96.77% → 100%, recommendationShare Lines 97.29% → 98.64%.

커버리지가 낮은 영역(후속 권장): `excelSpendingParser.ts` 59.37%, `SpendingImporter.tsx` 59.84%, `MerchantRulesModal.tsx` 57.5%, `importerParser.ts` 68%(Gemini 경로), `RecommendationShareButton.tsx` 61.66%.
