---
name: Feature Template
about: 기능 추가 이슈 템플릿
title: "[Feat] 카드 실적/할인 제외 항목(세금, 아파트관리비, 상품권 등) 안내 및 주의 뱃지 제공"
labels: 'enhancement'
assignees: 'Giheon-Jeon'
---

## 기능 설명
국세/지방세, 4대보험, 아파트관리비, 상품권(상테크), 초중고 납입금 등 주요 실적 인정 제외 및 혜택 제외 항목을 카드 상세 모달 및 추천 결과에서 명확히 경고하고 필터링할 수 있도록 지원합니다. 사용자가 무실적/제외 카테고리에 큰 지출을 입력했을 때 혜택 과다 추정을 방지합니다.

## 작업 상세 내용
- [x] 카드 카탈로그 benefitSummary 및 비고란에서 실적/할인 제외 키워드 파서 확장 (`src/lib/cardExclusionParser.ts`)
- [x] 카드 상세 모달(`CardDetailModal.tsx`) 내 '실적/혜택 제외 항목' 경고 뱃지 및 주의 섹션 배치
- [x] 시뮬레이터에서 공과금/상품권 등 제외 항목이 많은 지출 입력 시 주의 툴팁 제공 (`SpendingSimulator.tsx`)
- [x] 추천 결과 최적 카드 배너에 카드별 실적 제외 주의 뱃지 연동 (`RecommendationResult.tsx`)
- [x] 제외 조건 파싱 및 뱃지 렌더링 단위 테스트 작성 (`tests/cardExclusionParser.test.ts`, `tests/CardDetailModal.test.tsx`, `tests/SpendingSimulator.test.tsx`)

## 참고 자료(선택)
- GitHub 이슈: #97
- 파서 모듈: `src/lib/cardExclusionParser.ts`
- 상세 모달: `src/components/catalog/CardDetailModal.tsx`
- 추천 결과: `src/components/RecommendationResult.tsx`
- 지출 시뮬레이터: `src/components/SpendingSimulator.tsx`
