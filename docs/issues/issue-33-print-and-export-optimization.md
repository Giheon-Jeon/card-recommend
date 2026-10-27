---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 비교표 및 추천 분석 리포트 인쇄(Print CSS) 최적화 및 PDF/이미지 내보내기"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
카드 비교 모달이나 최종 추천 결과 리포트를 인쇄하거나 PDF 파일로 보관하려는 사용자를 위해 `@media print` 스타일을 최적화하고, A4 규격에 군더더기 없이 깔끔하게 정리되는 리포트 내보내기 서식과 인쇄 트리거 기능을 제공합니다.

## 작업 상세 내용
- [x] 불필요한 UI(네비게이션, 슬라이더, 토글 버튼 등)를 인쇄 시 자동 숨김 처리하는 `@media print` 스타일시트 적용 (`src/index.css`)
  - A4 Portrait 용지 규격 및 여백(`margin: 10mm 10mm 12mm 10mm`) 설정
  - 브라우저 인쇄 시 배경색 및 고대비 그래픽 보존(`print-color-adjust: exact`)
  - `.no-print`, `nav`, 슬라이더(`input[type="range"]`), 스위치 토글(`role="switch"`), 테마 토글, 파일 업로더 등 화면 제어용 인터랙티브 요소 일괄 숨김
  - 테이블 및 카드 블록의 어색한 페이지 분할 방지(`page-break-inside: avoid`)
  - 모달 다이얼로그(`dialog[open]`)의 `fixed` 뷰포트 제한을 해제하고 전체 테이블을 인쇄 영역으로 전개
- [x] 카드 비교 모달 내 '비교표 인쇄 / PDF 저장' 버튼 배치 및 인쇄 전용 헤더/푸터 서식 구성 (`src/components/catalog/CardComparisonModal.tsx`)
  - 모달 상단 헤더 및 하단 푸터에 직관적인 인쇄/PDF 저장 버튼 배치 (`data-testid="print-comparison-btn"`)
  - 인쇄 시에만 나타나는 전용 헤더(출력 일시, 비교 대상 카드 수) 및 푸터(공식 상품공시실 출처 안내) 서식 구현
  - 인쇄 시 닫기(X), 모달 백드롭 오버레이, 카드별 제외 버튼, 내 카드 담기 액션 행 자동 숨김
- [x] 추천 결과 요약 리포트 전용 인쇄 레이아웃 구현 (`src/components/RecommendationResult.tsx`, `src/components/PortfolioRecommendation.tsx`)
  - 추천 결과 헤더 영역에 '리포트 인쇄' 버튼 배치 (`data-testid="recommendation-print-btn"`)
  - 리포트 인쇄 전용 헤더(단일/포트폴리오 분석 구분, 출력 일시, 월 예상 지출액, 절세 연봉 기준) 및 법적 안내 푸터 구성
  - 인쇄 시 단일/포트폴리오 탭 전환기, 결과 복사 버튼, 소득공제 토글 스위치 및 연봉 변경 팝오버 숨김 처리
  - 시뮬레이터 페이지(`src/components/SimulatorPage.tsx`) 인쇄 시 배너, 지출 내역 가져오기 드롭존, 카드 목록을 숨기고 분석 리포트에 집중
- [x] 인쇄 트리거 및 접근성 점검 (`tests/CardComparison.test.tsx`, `tests/RecommendationResult.test.tsx`, `tests/a11y.test.tsx`)
  - 인쇄 버튼 키보드 접근성, 명확한 `aria-label` 및 WAI-ARIA/WCAG 준수 검증
  - `window.print()` 호출 트리거 단위 테스트 작성 및 통과
  - 전체 42개 파일 443개 테스트 ALL PASS 및 `oxlint`, `oxlint -D jsx-a11y` 0건 통과

## 참고 자료(선택)
- GitHub 이슈: #101
- 인쇄 CSS 및 유틸리티: `src/index.css`
- 카드 비교 모달: `src/components/catalog/CardComparisonModal.tsx`
- 추천 결과 컴포넌트: `src/components/RecommendationResult.tsx`
- 포트폴리오 컴포넌트: `src/components/PortfolioRecommendation.tsx`
- 시뮬레이터 페이지: `src/components/SimulatorPage.tsx`
- 단위 테스트: `tests/CardComparison.test.tsx`, `tests/RecommendationResult.test.tsx`, `tests/a11y.test.tsx`
