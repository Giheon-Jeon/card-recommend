---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 월 지출 시뮬레이터 입력값 로컬 영구 저장 및 초기화 기능"
labels: 'enhancement'
assignees: ''
---

## 기능 설명
사용자가 정성껏 입력하거나 영수증에서 가져온 카테고리별 지출 금액이 브라우저 새로고침 시 0원으로 모두 초기화되는 사용자 경험(UX) 결함을 개선합니다. 지출 프로필 데이터를 `localStorage`에 자동 저장/복원하고, 언제든 처음 상태로 되돌릴 수 있는 "전체 지출 초기화(0원)" 버튼을 제공합니다.

## 작업 상세 내용
- [ ] 지출 프로필 상태(`spending`)를 `localStorage`에 자동 동기화하는 커스텀 훅(`useSpendingProfile` 등) 구현
- [ ] `SpendingSimulator` 상단 헤더에 "전체 초기화" 버튼 추가 및 확인 다이얼로그 연동
- [ ] 카테고리별 슬라이더 최대값(현재 100만원 고정)을 고액 지출자 상황에 맞게 300만/500만원으로 동적 확장하거나 수동 입력 시 자동 스케일 조정 지원
- [ ] 스토리지 복원 및 초기화 동작 단위 테스트 작성

## 참고 자료(선택)
`src/components/SpendingSimulator.tsx`, `src/components/SimulatorPage.tsx`
