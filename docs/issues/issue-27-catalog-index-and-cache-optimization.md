---
name: Refactor Template
about: 리팩토링 및 성능 최적화 이슈 템플릿
title: "[Refactor] 카드 카탈로그(670KB+) 인메모리 검색 인덱싱 및 혜택 계산 캐싱 최적화"
labels: 'enhancement, performance'
assignees: 'Giheon-Jeon'
---

## 기능 설명
전체 카드 카탈로그 데이터(`cards-catalog.json`)가 약 675KB에 달하며, 카드 갤러리 탐색 및 시뮬레이터에서 필터링, 정렬, 혜택 계산이 빈번하게 일어납니다. 입력이나 필터 변경 시 전체 카드 목록을 매번 순회하고 정규표현식 파싱을 반복하는 비용을 절감하기 위해 인메모리 검색 인덱스를 사전 구축하고 혜택 계산 결과를 메모이제이션 캐싱하여 반응 속도를 최적화합니다.

## 작업 상세 내용
- [x] 카탈로그 초기 로드 시 카드명, 카드사, 카테고리 태그 기반 경량 검색 인덱스(Token Map) 1회 사전 생성 (`src/lib/catalogIndex.ts`)
- [x] `CatalogGallery` 다중 필터(카드사, 연회비 구간, 혜택 유형) 적용 시 사전 인덱스를 활용한 빠른 필터링 적용 (`src/components/catalog/CatalogGallery.tsx`)
- [x] `recommender.ts` 및 `benefitCalculator.ts`에서 동일 지출 프로필에 대한 개별 카드의 혜택 계산 결과를 LRU 기반(2,000건 제한)으로 메모이제이션 (`src/lib/benefitCalculator.ts`, `src/lib/recommender.ts`)
- [x] 대량 카드 렌더링 시 React.memo 및 contentVisibility 기반 렌더링 최적화 (`src/components/catalog/CatalogCardTile.tsx`)
- [x] 벤치마크 및 검색 인덱스/혜택 캐시 단위 테스트 작성 및 통과 검증 (`tests/catalogIndex.test.ts`, `tests/benefitCache.test.ts`, `tests/CatalogGallery.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #89
- 카탈로그 인덱서: `src/lib/catalogIndex.ts`
- 갤러리 컴포넌트: `src/components/catalog/CatalogGallery.tsx`
- 혜택 계산 및 랭킹 엔진: `src/lib/benefitCalculator.ts`, `src/lib/recommender.ts`
- 성능 최적화 보고서: `docs/performance-optimization.md`
