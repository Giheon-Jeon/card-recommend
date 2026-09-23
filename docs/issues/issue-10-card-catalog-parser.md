---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 카탈로그 데이터 수집 및 혜택 요약 정규화 파서 파이프라인 구축"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
국내 주요 카드사의 카드 정보 및 혜택 요약 텍스트를 수집하고, 애플리케이션에서 시뮬레이션 및 추천에 활용할 수 있도록 카테고리별 할인/적립률, 전월실적, 연회비 정보가 포함된 도메인 모델(`Card`)로 변환·정규화하는 파이프라인을 구축합니다.

## 작업 상세 내용
- [x] 카드 카탈로그 크롤링 및 로컬 정적 데이터셋 적재 (`scripts/fetchCardCatalog.ts`, `data/catalog/cards-catalog.json`)
- [x] 카드 혜택 요약 문장 파싱 및 정규표현식 기반 할인율/적립률/마일리지 추출기 구현 (`src/lib/cardConverter.ts`)
- [x] 10개 핵심 소비 카테고리(`data/categories.json`) 키워드 자동 매핑 로직 구현
- [x] 혜택 정보가 부실하거나 연회비/실적 정보가 누락된 불완전 카드 필터링 유틸리티(`isInfoInsufficient`) 구현
- [x] 카탈로그 카드 변환 정합성 단위 테스트 작성 (`tests/cardConverter.test.ts`, `tests/loadCatalog.test.ts`)

## 참고 자료(선택)
- GitHub 이슈: #60
- `src/types/catalog.ts`, `src/types/card.ts`
- `src/lib/cardConverter.ts`, `src/lib/loadCatalog.ts`
