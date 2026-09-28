---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 영수증 이미지 OCR 및 Gemini Vision AI 기반 스마트 지출 내역 추출"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
사용자가 종이 영수증 또는 전자 영수증 캡처 이미지를 업로드하면 Google Gemini Vision API를 활용하여 가맹점명, 결제 일시, 금액, 소비 카테고리를 자동으로 분석·추출하는 스마트 지출 가져오기 시스템을 구축합니다.

## 작업 상세 내용
- [x] 영수증 이미지 및 결제 문자 텍스트 입력 UI 구현 (`src/components/SpendingImporter.tsx`)
- [x] 파일 업로드 보안 검증(최대 5MB 제한, JPEG/PNG/WebP 유효 확장자 검사)
- [x] Gemini API 키 전역 설정 모달 및 안전한 상태 관리 컨텍스트 연동 (`src/contexts/GeminiApiKeyContext.tsx`, `src/components/ApiKeySettings.tsx`)
- [x] Gemini Multimodal 프롬프트 엔지니어링 및 JSON 스키마 기반 정형 데이터 파서 구현 (`src/lib/importerParser.ts`)
- [x] AI 연동 UI 보호를 위한 React 19 호환 에러 바운더리(`ErrorBoundary.tsx`) 적용
- [x] 영수증 파싱 유틸리티 및 API 키 설정 컴포넌트 단위 테스트 작성 (`tests/importerParser.test.ts`, `tests/ApiKeySettings.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #62
- Google Gemini API (`@google/generative-ai`)
- `src/lib/importerParser.ts`, `src/components/SpendingImporter.tsx`
