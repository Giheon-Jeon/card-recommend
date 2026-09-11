---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 영수증 이미지 업로드 파일 크기 제한 및 지원 포맷 검증"
labels: 'enhancement'
assignees: ''
---

## 기능 설명
사용자가 30MB 이상의 대용량 고화질 사진이나 지원하지 않는 이미지 포맷을 업로드할 때 브라우저 탭 메모리가 폭증하거나 프리징이 발생하는 현상을 방지하기 위해, 파일 크기 제한(Client-side Max Size Validation)과 허용 포맷 검증 및 안내 UI를 추가합니다.

## 작업 상세 내용
- [ ] 파일 업로드 시 최대 용량 제한(예: 10MB) 검증 및 초과 시 경고 메시지 표시
- [ ] Gemini API가 지원하는 권장 이미지 포맷(`image/jpeg`, `image/png`, `image/webp`, `image/heic`) 확장자 화이트리스트 검증
- [ ] 드래그앤드롭 및 파일 선택 영역에 "최대 10MB, JPG/PNG/WebP 지원" 안내 라벨 추가
- [ ] 대용량 파일 선택 시 조기 리턴 및 사용자 피드백 토스트/에러 배너 렌더링 검증
- [ ] 업로드 검증 로직 관련 단위 테스트 작성

## 참고 자료(선택)
`src/components/SpendingImporter.tsx`의 `handleFileChange` 함수
