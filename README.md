# 카드 혜택 트래커 (Card Benefit Tracker)
## 보유한 신용/체크카드의 전월실적 조건과 혜택을 정리하고, 지출 패턴에 맞는 최적의 카드를 추천해주는 개인용 웹앱

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
- [📂 카드 데이터 입력하기](#-카드-데이터-입력하기)

---

## ✨ 주요 기능
1. **카드 전월실적 & 혜택 매칭**: 입력된 카드별 전월실적 구간(Tier)과 혜택 한도를 기반으로 정확한 예상 피드백을 연산합니다.
2. **지출 시뮬레이션**: 카테고리별 예상 지출액을 입력하면 보유한 카드 조합 중 가장 이득이 되는 최적의 카드와 조합을 순위로 추천합니다.
3. **카드 데이터 구조 유효성 검증**: 자체 검증 스크립트를 통해 카드 데이터 파일 포맷이 일치하는지 자동으로 진단합니다.

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

---

## 🏗 아키텍처 및 폴더 구조
유지보수성과 계산 로직의 격리를 고려한 구조 채택
```text
card-recommend/
├── 📁 data/                  # 지출 카테고리 정의 및 카드별 JSON 데이터
│   ├── categories.json       # 지출 카테고리 정의 파일
│   └── 📁 cards/             # 카드별 데이터 파일 (1 JSON = 1 Card)
├── 📁 src/                   # React 메인 소스 코드
│   ├── 📁 types/             # Card, Benefit, SpendingProfile 등 공통 타입 정의
│   ├── 📁 lib/               # 카드 데이터 로더, 계산기 및 추천 엔진 핵심 로직
│   ├── 📁 components/        # 지출 시뮬레이터, 카드 리스트, 추천 결과 UI 컴포넌트
│   └── App.tsx
├── 📁 tests/                 # Vitest 단위 테스트 파일
└── 📁 scripts/               # 카드 JSON 데이터 스키마 유효성 검사 스크립트
```

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

---

## 📂 카드 데이터 입력하기
`data/cards/` 폴더 내에 JSON 형식으로 실제 보유하신 카드 데이터를 작성하여 배치할 수 있습니다. 

```json
{
  "id": "shinshin-abc",
  "name": "실제 카드 이름",
  "issuer": "카드사",
  "cardType": "credit",
  "annualFee": 15000,
  "excludedCategories": ["mobile"],
  "tiers": [
    {
      "minSpend": 300000,
      "benefits": [
        { "category": "convenience", "type": "discount", "rate": 0.05, "capPerMonth": 5000 }
      ]
    }
  ]
}
```
* **유효성 검사 실행**:
  ```bash
  npm run validate:cards
  ```

---

## 🔄 카드 카탈로그 자동 수집
`scripts/fetchCardCatalog.ts`는 카드고릴라(card-gorilla.com) 상세 페이지에 SEO용으로 정적 렌더링되는 `application/ld+json`을 읽어 카드명 / 카드사 / 연회비 / 이미지 URL / 혜택 요약을 `data/catalog/cards-catalog.json`에 모아줍니다. 전월실적 구간별 상세 혜택(`tiers`)은 이 스크립트로 수집되지 않으므로, 카탈로그를 참고해 `data/cards/*.json`에 직접 구조화해서 채워 넣어야 합니다.

```bash
npm run fetch:catalog                 # 전체 카드 수집
npm run fetch:catalog -- --limit=50   # 개수 제한 (테스트용)
```

* 사이트맵(`sitemap-cards.xml`)에서 카드 ID 목록을 가져온 뒤, 요청 간 0.3초 간격을 두고 순회합니다.
* 카드고릴라 이용약관에 크롤링 제한 조항이 있는지 정기적으로 직접 확인하고, 과도한 요청은 피해주세요.
