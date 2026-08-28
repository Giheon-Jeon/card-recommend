# 카드 혜택 트래커 (Card Benefit Tracker)
## 국내 카드 카탈로그를 둘러보고, 내 카드를 담아 지출 패턴에 맞는 최적의 카드를 추천해주는 개인용 웹앱

<p align="center">
  <strong>Giheon-Jeon / card-recommend</strong><br>
  합리적인 카드 소비를 위한 개인 맞춤형 혜택 계산기
</p>

---

## 📌 목차
- [주요 기능](#-주요-기능)
- [🛠 기술 스택 및 선정 이유](#-기술-스택-및-선정-이유)
- [🏗 아키텍처 및 폴더 구조](#-아키텍처-및-폴더-구조)
- [🤝 협업 및 자동화 규칙](#-협업-및-자동화-규칙)
- [🚀 시작하기](#-시작하기)
- [🔄 카드 카탈로그 자동 수집](#-카드-카탈로그-자동-수집)

---

## ✨ 주요 기능
1. **카드 갤러리**: 카드고릴라에서 수집한 1,400여 개 국내 신용/체크카드를 카드명·카드사·종류로 검색/필터링하며 둘러볼 수 있습니다.
2. **내 카드 담기**: 관심 있거나 보유한 카드를 "내 카드"에 담아 관리하고, 담은 카드들의 연회비 합계를 한눈에 확인할 수 있습니다.
3. **혜택 시뮬레이터**: 카테고리별 예상 월 지출액을 입력하면
   - **내 카드 중 추천**: 담아둔 카드 중 순혜택(혜택액 − 월 환산 연회비)이 가장 큰 카드와, 카테고리별 최적 카드 조합을 계산합니다.
   - **전체 카드 중 추천**: 즐겨찾기 여부와 무관하게 카탈로그의 전체 카드를 대상으로 동일하게 계산합니다.
4. **외부 지출 내역 가져오기**: 결제 문자/카드사 알림 텍스트나 영수증 이미지를 업로드하면 지출 항목을 자동으로 카테고리별로 분류해 시뮬레이터에 반영합니다. Gemini API Key가 없어도 로컬 키워드 매칭으로 텍스트를 분석할 수 있고, Key를 등록하면 Gemini 2.0 Flash로 텍스트·이미지(OCR)를 더 정확하게 분석합니다.

---

## 🛠 기술 스택 및 선정 이유

### Frontend
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

- **Vite + React**: 가볍고 빠른 빌드 속도로 즉각적인 화면 렌더링 및 생산성을 높이기 위해 선정.
- **TypeScript**: 카드 데이터 및 계산 로직 내의 데이터 구조(Type) 안정성 및 오차 예방.
- **Tailwind CSS v4**: `@tailwindcss/vite` 기반으로 빠르고 조화로운 UI 레이아웃 설계.
- **Vitest**: 계산 로직과 추천 알고리즘의 정확성을 보장하기 위한 단위 테스트 환경 제공.
- **@google/generative-ai (Gemini)**: 지출 내역 텍스트/영수증 이미지에서 상호명·금액·카테고리를 추출하는 AI 분석기에 사용. API Key는 브라우저 LocalStorage에만 저장되며 서버로 전송되지 않습니다.

---

## 🏗 아키텍처 및 폴더 구조
유지보수성과 계산 로직의 격리를 고려한 구조 채택. 서버 없이 전부 클라이언트에서 동작하는 SPA입니다.
```text
card-recommend/
├── 📁 data/
│   ├── categories.json         # 지출 카테고리 정의 파일
│   ├── 📁 catalog/             # fetch:catalog로 수집한 전체 카드 원본 데이터 (cards-catalog.json)
│   └── 📁 cards/                # (선택) 전월실적 구간까지 직접 구조화한 수동 카드 데이터
├── 📁 src/
│   ├── 📁 types/                # Card, CatalogEntry, SpendingProfile 등 공통 타입 정의
│   ├── 📁 lib/                   # 카탈로그/카드 로더, 혜택 계산기, 추천 엔진, 지출 파서
│   ├── 📁 components/
│   │   ├── 📁 catalog/           # 카드 갤러리, 내 카드, 카드 상세 모달
│   │   ├── SimulatorPage.tsx     # 혜택 시뮬레이터 탭 (내 카드 / 전체 카드 추천, 지출 입력, 결과)
│   │   ├── SpendingImporter.tsx  # 외부 지출 내역 가져오기 (데모/텍스트/이미지 탭)
│   │   ├── ApiKeySettings.tsx    # Gemini API Key 등록 팝오버
│   │   └── ParsedItemsTable.tsx  # 지출 파싱 결과 검토/수정 테이블
│   └── App.tsx                  # 탭 전환 셸 (카드 갤러리 / 내 카드 / 혜택 시뮬레이터)
├── 📁 tests/                    # Vitest 단위 테스트 파일
└── 📁 scripts/
    ├── fetchCardCatalog.ts      # 카드고릴라 카탈로그 수집 스크립트
    └── validateCardData.ts      # data/cards 스키마 유효성 검사 스크립트
```

### 데이터 흐름
- 카드 갤러리·내 카드·혜택 시뮬레이터는 모두 `data/catalog/cards-catalog.json`(카탈로그)을 기준으로 동작합니다.
- `src/lib/cardConverter.ts`가 카탈로그의 자연어 혜택 요약(`benefitSummary`)을 키워드 매칭으로 파싱해, 계산기가 이해하는 카테고리별 할인/적립률(`Card` 타입)로 변환합니다. 카탈로그에는 전월실적 구간 정보가 없어, 모든 카탈로그 카드는 실적 조건 없이(0원부터) 혜택이 적용되는 것으로 근사합니다.
- 전월실적 구간까지 정확히 반영하고 싶다면 [카드 데이터 직접 입력하기](#-카드-데이터-직접-입력하기)를 참고해 `data/cards/*.json`에 수동으로 작성할 수 있습니다.

---

## 🤝 협업 및 자동화 규칙
- **Git Branch Strategy**: `main` 브랜치 직접 커밋 금지, `BE-전기헌-(이슈번호)` 형태의 Feature 브랜치 전략 준수.
- **Commit Message Convention**: 규칙적인 이모지 및 태그를 사용한 Conventional Commit 스타일 엄수.

---

## 🚀 시작하기
아래 명령어를 통해 프로젝트 패키지를 설치하고 개발 서버를 가동합니다.
```bash
npm install
npm run dev
```

기타 스크립트:
```bash
npm run build           # 타입 체크 + 프로덕션 빌드
npm run test            # Vitest 단위 테스트 실행
npm run lint            # oxlint 정적 분석
npm run fetch:catalog   # 카드 카탈로그 수집/갱신
```

---

## 🔄 카드 카탈로그 자동 수집
`scripts/fetchCardCatalog.ts`는 카드고릴라(card-gorilla.com) 상세 페이지에 SEO용으로 정적 렌더링되는 `application/ld+json`을 읽어 카드명 / 카드사 / 연회비 / 이미지 URL / 혜택 요약을 `data/catalog/cards-catalog.json`에 모아줍니다. 앱의 카드 갤러리·내 카드·혜택 시뮬레이터는 이 파일을 기준으로 동작합니다.

```bash
npm run fetch:catalog                 # 전체 카드 수집
npm run fetch:catalog -- --limit=50   # 개수 제한 (테스트용)
```

* 사이트맵(`sitemap-cards.xml`)에서 카드 ID 목록을 가져온 뒤, 요청 간 0.3초 간격을 두고 순회합니다.
* 카드고릴라 이용약관에 크롤링 제한 조항이 있는지 정기적으로 직접 확인하고, 과도한 요청은 피해주세요.
* 이 스크립트는 전월실적 구간별 상세 혜택(`tiers`)까지는 수집하지 않으므로, 실적 구간을 정확히 반영하려면 아래 방법으로 직접 작성해야 합니다.

