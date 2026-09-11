---
name: Bug Template
about: 버그 리포트 이슈 템플릿
title: "[BUG] 결제 취소 및 환불 내역이 양수 지출로 합산되는 오류"
labels: 'bug'
assignees: ''
---

## 버그 설명
SMS 및 카카오톡 알림톡 결제 내역 텍스트 파싱 시, "승인취소", "결제취소", "환불", 마이너스 금액(예: `-15,000원`) 등의 취소 내역이 양수 지출로 인식되어 총 지출액이 오히려 증가하는 오류가 발생합니다.

## 자세한 경위
- 발생 환경: 브라우저 전반 (`src/lib/importerParser.ts`의 `parseTextLocally` 함수)
- 발생 빈도: 취소/환불 텍스트 입력 시 항상 발생
- 스크린샷/에러 로그:
  - 입력: `[신한체크취소] 09/04 11:20 스타벅스 5,500원 승인취소`
  - 현재 결과: `merchant: "스타벅스", amount: 5500, category: "cafe"` (양수로 반영되어 지출 증가)
  - 기대 결과: 음수 금액(`-5500`)으로 처리되거나 취소 내역으로 플래그 처리되어 기존 지출에서 차감

## 작업 상세 내용
- [ ] `parseTextLocally`에서 취소/환불 키워드("취소", "환불", "승인취소", "결제취소") 감지 정규식 추가
- [ ] 마이너스 부호(`-`, `▲`, `취소`)가 포함된 결제 건의 금액 음수(`-amount`) 변환 처리
- [ ] `ParsedItemsTable` 및 시뮬레이터 합산 시 음수 금액 반영(차감) 로직 검증
- [ ] 환불 및 취소 문자 파싱 단위 테스트(`tests/importerParser.test.ts`) 추가

## 참고 자료(선택)
`src/lib/importerParser.ts`, `src/components/SpendingImporter.tsx`, `src/components/ParsedItemsTable.tsx`
