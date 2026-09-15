---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 상세 모달 및 UI 컴포넌트 접근성(a11y) 강화 및 키보드 네비게이션 지원"
labels: 'enhancement'
assignees: ''
---

## 기능 설명
웹 접근성(WCAG 2.1) 및 키보드 사용자 경험을 향상하기 위해, 카드 상세 모달(`CardDetailModal`) 오픈 시 ESC 키 닫기, 포커스 트랩(Focus Trap), 모달 뒤 배경 스크롤 차단, 포커스 복원(Focus Restoration) 등을 적용합니다.

## 작업 상세 내용
- [x] `CardDetailModal` 열림 시 `Escape` 키 입력으로 닫기 이벤트 핸들링 추가
- [x] 모달 활성화 시 `body` 스크롤 잠금(`overflow: hidden`) 및 모달 닫힘 시 원복
- [x] 모달 내부 탭 포커스 순환(Focus Trap) 및 모달 종료 시 직전 포커스 엘리먼트로 복원
- [x] 모달 접근성 및 키보드 인터랙션 axe-core 테스트 추가 (`tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #47
- `src/components/catalog/CardDetailModal.tsx`, `tests/a11y.test.tsx`
