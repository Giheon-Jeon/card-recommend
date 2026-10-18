---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 추천 결과 및 최적 조합 요약 카드 공유(클립보드/이미지) 기능"
labels: 'enhancement, refactor'
assignees: 'Giheon-Jeon'
---

## 기능 설명
혜택 시뮬레이터를 통해 산출된 1위 추천 카드 및 2~3장 최적 포트폴리오 조합 결과를 외부 메신저나 SNS, 커뮤니티에 쉽게 공유할 수 있도록 깔끔한 텍스트 요약 클립보드 복사 기능 및 모바일 Web Share API 연동 공유 기능을 제공합니다.

## 작업 상세 내용
- [x] 추천 1위 카드 혜택 요약 및 포트폴리오 조합(각 카드별 분담 영역, 총 예상 혜택, 연회비 합산) 텍스트 포맷터 구현 (`src/lib/recommendationShare.ts`)
- [x] `RecommendationResult` 및 `PortfolioRecommendation` 상단에 '결과 복사' 버튼 추가 및 클립보드 복사 완료 토스트 알림 연동 (`src/components/RecommendationShareButton.tsx`, `src/components/RecommendationResult.tsx`, `src/components/PortfolioRecommendation.tsx`)
- [x] 모바일 환경을 위한 Web Share API 지원 (navigator.share 지원 시 공유 시트 호출, 미지원 환경 클립보드 fallback 지원)
- [x] 공유용 텍스트 내 개인정보(지출 세부액 등) 노출 여부 선택 옵션 또는 총액 기준 요약 제공 (`RecommendationShareButton` 내 개인정보 보호 옵션 토글 팝오버)
- [x] 접근성(버튼 aria-label, 복사 상태 공지, 시맨틱 dialog 및 focus ring) 및 관련 테스트 작성 (`tests/recommendationShare.test.ts`, `tests/RecommendationResult.test.tsx`, `tests/PortfolioRecommendation.test.tsx`, `tests/a11y.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #86
- 결과 컴포넌트: `src/components/RecommendationResult.tsx`, `src/components/PortfolioRecommendation.tsx`
- 전역 알림: `src/contexts/ToastContext.tsx`
