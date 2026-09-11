---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 갤러리 다중 정렬 옵션 및 내 카드 데이터 백업/가져오기"
labels: 'enhancement'
assignees: ''
---

## 기능 설명
현재 카드 갤러리는 고정된 카탈로그 순서로만 탐색이 가능하여 연회비나 혜택 기준 정렬이 불가능합니다. 카드 갤러리에 다중 정렬 옵션(연회비 낮은순/높은순, 카드명 가나다순, 최신순)을 도입하고, "내 카드"에 담아둔 북마크 데이터를 기기 간 이전하거나 보관할 수 있도록 JSON 내보내기/가져오기 기능을 제공합니다.

## 작업 상세 내용
- [ ] `CatalogGallery` 필터 바에 정렬 셀렉트 박스(연회비 오름/내림차순, 이름순 등) 추가 및 정렬 로직 적용
- [ ] `MyCardsPage` 화면 상단에 "내 카드 목록 백업 (JSON 다운로드)" 및 "불러오기 (JSON 업로드)" 버튼 추가
- [ ] 잘못된 형식의 JSON 업로드 시 스키마 검증 및 에러 토스트 안내
- [ ] 정렬 및 데이터 import/export 단위 테스트 작성

## 참고 자료(선택)
`src/components/catalog/CatalogGallery.tsx`, `src/components/catalog/MyCardsPage.tsx`, `src/lib/myCards.ts`
