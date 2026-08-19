# 카드 혜택 트래커

보유한 신용/체크카드의 전월실적 조건과 혜택을 정리하고, 카테고리별 지출액을 입력하면 어떤 카드를(또는 어떤 조합을) 쓰는 게 유리한지 추천해주는 개인용 웹앱입니다.

## 기술 스택

- Vite + React + TypeScript
- Tailwind CSS v4 (`@tailwindcss/vite`)
- Vitest (단위 테스트)

## 시작하기

```bash
npm install
npm run dev
```

## 카드 데이터 입력하기

`data/cards/` 폴더에 있는 `example-card-*.json` 파일은 데이터 구조를 보여주기 위한 **예시**입니다. 실제 보유 카드로 교체하려면 같은 폴더에 카드 1장당 JSON 파일 1개를 만들면 됩니다.

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

- `category`는 `data/categories.json`에 정의된 ID 중 하나를 사용합니다. 필요한 카테고리가 없으면 이 파일에 추가하세요.
- `tiers`는 전월실적 구간별 혜택이며, `minSpend` 오름차순으로 작성해야 합니다.
- `excludedCategories`는 전월실적 산정에서 제외되는 카테고리입니다(세금, 상품권, 통신비 등 카드사마다 다르므로 실제 약관을 확인하세요).

카드 데이터를 추가/수정한 뒤에는 아래 명령으로 구조가 올바른지 검증할 수 있습니다.

```bash
npm run validate:cards
```

## 카드 데이터 정확성에 대한 주의

이 저장소에 포함된 예시 카드 데이터는 실제 카드사 혜택과 무관한 가상의 값입니다. 본인의 카드 데이터를 입력할 때는 카드사 공식 홈페이지나 앱에서 최신 약관을 직접 확인해서 반영하시기 바랍니다. 카드 혜택과 전월실적 기준은 카드사가 수시로 변경할 수 있습니다.

## 프로젝트 구조

```
card-benefit-tracker/
├── data/
│   ├── categories.json      # 지출 카테고리 정의
│   └── cards/                # 카드별 데이터 (JSON, 1파일 = 1카드)
├── src/
│   ├── types/                 # Card, Benefit, SpendingProfile 등 타입 정의
│   ├── lib/
│   │   ├── loadCards.ts       # data/cards 폴더를 읽어오는 로더
│   │   ├── benefitCalculator.ts  # 카드 1장 기준 혜택 계산 로직
│   │   └── recommender.ts        # 카드 랭킹 / 카테고리별 최적 조합 로직
│   ├── components/
│   │   ├── SpendingSimulator/ # 카테고리별 지출액 입력 폼
│   │   ├── CardList/          # 보유 카드 비교 표
│   │   └── RecommendationResult/  # 추천 결과 및 카테고리별 최적 카드
│   └── App.tsx
├── tests/                     # Vitest 단위 테스트
└── scripts/
    └── validateCardData.ts    # 카드 JSON 데이터 구조 검증 스크립트
```

## 앞으로 확장할 만한 것들

- 연회비 대비 실효 혜택(순혜택) 기준 정렬 외에, 혜택 한도 소진율 같은 지표 추가
- 카드 데이터가 많아지면 JSON 파일 대신 SQLite/Supabase로 이전
- 지출 프로필을 로컬에 저장(파일 export/import)해서 매번 다시 입력하지 않도록 개선
- 카드사 공지사항이나 약관 변경 알림 연동
