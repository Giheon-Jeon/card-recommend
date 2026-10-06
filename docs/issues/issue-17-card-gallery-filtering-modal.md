---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 갤러리 탐색, 다중 필터링/정렬 및 카드 상세 스펙 모달"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
카탈로그에 등록된 수백 종의 카드를 한눈에 탐색할 수 있도록 실시간 카드명 검색(디바운스 적용), 카드사별·유형별(신용/체크) 다중 필터링, 다양한 정렬 옵션 및 카드별 전월실적 구간과 세부 혜택을 확인할 수 있는 상세 모달을 제공합니다.

## 작업 상세 내용
- [x] 카드 검색 입력창(300ms 디바운스 적용) 및 카드사/카드종류 필터 셀렉터 구현 (`src/components/catalog/CatalogGallery.tsx`)
- [x] 혜택 많은 순, 연회비 낮은 순, 인기순 등 다중 정렬 옵션 지원
- [x] 대량 카드 렌더링 성능 최적화를 위한 20개 단위 점진적 '더 보기' 및 '맨 위로 이동' 플로팅 버튼 구현
- [x] 카드 타일 컴포넌트(`CatalogCardTile.tsx`) 내 연회비, 실적 기준, 혜택 요약 뱃지 표시
- [x] 카드 클릭 시 열리는 상세 정보 모달(`CardDetailModal.tsx`) 내 실적 구간별 혜택표 렌더링
- [x] 갤러리 검색/필터/정렬 및 카드 타일 렌더링 단위 테스트 작성 (`tests/CatalogGallery.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #67
- `src/components/catalog/CatalogGallery.tsx`, `src/components/catalog/CatalogCardTile.tsx`, `src/components/catalog/CardDetailModal.tsx`
