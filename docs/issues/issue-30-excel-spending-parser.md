---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 금융사 엑셀(.xlsx/.xls) 지출 명세서 직접 업로드 및 자동 시트 파싱 지원"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
카드사 홈페이지나 모바일 앱에서 다운로드한 엑셀(.xlsx, .xls) 청구서/이용명세서를 별도의 수동 CSV 변환 없이 웹 브라우저에서 직접 읽어 지출 항목으로 자동 정형화합니다. 순수 웹 표준 API(DecompressionStream, TextDecoder) 기반의 zero-dependency 경량 파서로 번들 크기를 최적화하고, 국내 주요 8개 카드사가 기본 제공하는 다양한 엑셀 양식(OpenXML, XML Spreadsheet 2003, HTML Table)을 즉시 파싱하여 사용자 편의성을 극대화합니다.

## 작업 상세 내용
- [x] 경량 엑셀 시트 파싱 모듈 구현 (`src/lib/excelSpendingParser.ts`)
  - OpenXML(.xlsx) ZIP 아카이브 및 sharedStrings.xml, sheet1.xml 파싱
  - XML Spreadsheet 2003 및 금융사 레거시 HTML Table(.xls) 파싱
  - 10MB 이하 파일 크기 및 확장자 유효성 검증 (`validateExcelFile`)
- [x] 주요 8개 카드사 엑셀 양식 헤더 자동 감지 및 지출 항목 변환
  - 신한, 현대, 삼성, KB국민, 롯데, 우리, 하나, NH농협 8대 카드사 헤더 패턴 자동 매핑
  - 상단 고객명/카드번호/조회기간 등 메타데이터 행 자동 스킵 및 합계/소계 행 제외
  - 취소/환불 내역 판별 및 음수 금액 변환
  - 가맹점명 및 업종 기반 카테고리 자동 추론 및 커스텀 가맹점 룰 최우선 적용
- [x] `SpendingImporter` 컴포넌트 드롭존 및 파싱 파이프라인 연동 (`src/components/SpendingImporter.tsx`)
  - 파일 드롭존 `accept` 속성에 `.xlsx`, `.xls` 확장자 및 MIME 타입 추가
  - 엑셀과 CSV 파일 자동 구분 파싱 파이프라인 연결 및 상태 토스트 피드백 제공
- [x] 8대 카드사 모의 엑셀 데이터 파싱 및 컴포넌트 단위 테스트 작성
  - 8대 카드사별 양식, 취소/환불, 커스텀 룰, 에러 처리 단위 테스트 (`tests/excelSpendingParser.test.ts`)
  - `SpendingImporter` 엑셀 파일 업로드 및 시뮬레이터 적용 통합 테스트 (`tests/SpendingImporter.test.tsx`)
  - WAI-ARIA 접근성 및 린트 검증 통과 (`tests/a11y.test.tsx`, `oxlint`)

## 참고 자료(선택)
- GitHub 이슈: #98
- 파서 모듈: `src/lib/excelSpendingParser.ts`
- 입력 컴포넌트: `src/components/SpendingImporter.tsx`
- 단위 테스트: `tests/excelSpendingParser.test.ts`, `tests/SpendingImporter.test.tsx`
