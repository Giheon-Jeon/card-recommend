# Issue #122: CI/CD 품질 게이트 강화 및 워크플로 보안 설정

## 배경 및 원인
1. **CI 품질 게이트 누락 (CA-005)**: `.github/workflows/ci.yml`에 타입 검사(`tsc -b`), 프로덕션 빌드(`npm run build`), 커버리지 임계값, 의존성 보안 감사가 누락되어 있고, `npm ci || npm install` 폴백으로 lockfile 불일치 실패가 은폐될 수 있었습니다.
2. **CD 빌드 실패 은폐 및 구버전 Node 매트릭스 (CA-006)**: `.github/workflows/cd.yml`이 지원 종료된 Node 18을 포함하고 있으며 `npm run build || echo "No build script found"`로 빌드 실패를 은폐하고 있었습니다.
3. **GitHub Actions 공급망 보안 미비 (CA-011)**: 워크플로에 최소 권한(`permissions`)이 명시되지 않았고, `actions/checkout@v4`, `actions/setup-node@v4`가 mutable 태그 및 Node 20 deprecated 런타임으로 실행되고 있었습니다.

## 해결 내용
- **`vite.config.ts`**
  - `test.coverage.thresholds`에 `lines: 81`, `branches: 74` 임계값을 설정해 커버리지 하락 시 CI가 실패하도록 강화했습니다.
- **`.github/workflows/ci.yml`**
  - 최상단 `permissions: contents: read` 명시 및 `actions/checkout`(`v7.0.1`), `actions/setup-node`(`v7.1.0`)의 커밋 SHA 고정과 `cache: 'npm'` 활성화를 적용했습니다.
  - `npm ci` 단독 사용으로 변경하고, `npx tsc -b`, `npm run test:coverage`, `npm run build`, `npm audit --omit=dev --audit-level=high` 단계를 추가했습니다.
- **`.github/workflows/cd.yml`**
  - 실제 배포는 Vercel 연동이 담당하므로 워크플로를 `main`/`master` 브랜치 빌드 검증 용도로 정리했습니다.
  - Node.js 매트릭스를 `[20.x, 22.x]`로 통일하고, `permissions: contents: read` 및 액션 SHA 고정을 적용했으며, `npm ci`와 `npm run build` 실패 시 즉시 워크플로가 실패하도록 수정했습니다.
