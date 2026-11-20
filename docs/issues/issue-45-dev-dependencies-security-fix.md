# Issue #121: 개발 의존성 High 취약점 3건 (vite, happy-dom, source-map-js)

## 배경 및 원인
`npm audit` 실행 시 개발 의존성(`devDependencies`) 및 하위 의존성에서 High 3건(`vite`, `happy-dom`, `source-map-js`), Moderate 3건(`@vitest/mocker`, `vitest`, `@vitest/coverage-v8`) 등 총 6건의 보안 취약점이 검출되었습니다.

## 해결 내용
`npm audit fix --force`를 사용하지 않고 패키지별로 호환 가능한 안전 버전으로 순차 상향했습니다.

- **`vite` (`^8.2.0` → `^8.3.8`) 및 `source-map-js`**
  - `vite`를 `8.3.8` 이상으로 상향하고 `source-map-js`를 최신 패치 버전으로 갱신하여 개발 서버 스크립트 실행·명령 주입 및 event-loop DoS 취약점을 조치했습니다.
- **`happy-dom` (`^20.11.15` → `^21.0.4`, 메이저 버전 상향)**
  - `20.x`에서 `21.0.4`로 메이저 업그레이드하여 import alias 호스트 코드 실행(`GHSA-834v-8h66-3h79`) 및 SSRF·쿠키 스코프 위조 취약점을 조치했습니다.
- **`vitest`, `@vitest/coverage-v8` (`^4.1.11` → `^4.1.12`)**
  - `4.1.12`로 상향해 `@vitest/mocker`의 코드 주입 및 경로 우회 취약점을 함께 해결했습니다.

## 검증 결과
- `npm audit`: `found 0 vulnerabilities`
- `npm run lint`, `npm run lint:a11y`, `npx tsc -b`, `npm test`, `npm run build` 전체 회귀 테스트 통과
