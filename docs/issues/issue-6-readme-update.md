---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Docs] 최근 추가 기능 반영 및 아키텍처 구조 최신화를 위한 README.md 업데이트"
labels: 'documentation'
assignees: ''
---

## 기능 설명
최근 34번~38번 이슈를 통해 환불 내역 음수 차감, 영수증 업로드 제한 및 검증, 지출 파싱 결과 수동 추가/일괄 삭제, 지출 프로필 로컬 영구 저장 및 슬라이더 스케일링, 카드 갤러리 다중 정렬, 내 카드 JSON 백업/가져오기, API Key 보안 스토리지 등 다양한 주요 기능이 추가되었습니다. 하지만 현재 `README.md`는 초기 기능 명세 및 구조에 머물러 있어 사용자 및 개발자 안내를 위해 이를 최신화합니다.

## 작업 상세 내용
- [x] `주요 기능` 섹션에 신규 기능 7종(다중 정렬, JSON 백업/불러오기, 시뮬레이터 영구저장/초기화, 환불 음수금액 차감, 파싱 테이블 직접추가/일괄삭제, 영수증 용량/포맷 검증, API Key 보안 설정) 상세 추가
- [x] `아키텍처 및 폴더 구조`에 신규 모듈(`src/lib/spendingProfile.ts`, `src/lib/myCards.ts`, `src/contexts/GeminiApiKeyContext.tsx`) 및 컴포넌트 추가
- [x] `시작하기` 섹션의 스크립트 목록에 접근성 린트(`npm run lint:a11y`) 등 신규 스크립트 추가
- [x] 프로젝트 템플릿 양식과 마크다운 스타일(Rule 4) 엄격 준수

## 참고 자료(선택)
- GitHub 이슈: #44
- `README.md`
