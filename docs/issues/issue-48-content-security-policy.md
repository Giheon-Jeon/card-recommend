# Issue #124: Content-Security-Policy 적용

## 배경 및 목적
사용자의 Gemini API 키가 브라우저 스토리지에 보관되는 클라이언트 전용 아키텍처에서, 잠재적 XSS 공격으로 인한 키 탈취 및 비인가 외부 도메인 전송을 방어하기 위해 Content-Security-Policy(CSP)를 적용합니다 (`CA-012`).

## 적용 내용
- **`index.html`**
  - FOUC 방지 인라인 테마 스크립트를 단일 행 IIFE로 정규화해 OS 줄바꿈(LF/CRLF) 차이로 인한 SHA-256 해시 불일치를 방지했습니다.
  - `<meta http-equiv="Content-Security-Policy">` 태그를 적용해 `script-src 'self' 'sha256-...'`, `connect-src 'self' https://generativelanguage.googleapis.com`, `img-src 'self' data: blob: https://d1c5n4ri2guedi.cloudfront.net`, `object-src 'none'` 등 최소 허용 정책을 설정했습니다.
- **`vercel.json`**
  - Vercel 배포 환경 HTTP 응답 헤더로 동일한 CSP 정책과 함께 `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`을 적용했습니다.
- **`tests/csp.test.ts`**
  - `index.html` 인라인 스크립트의 실제 SHA-256 해시와 `index.html` meta 태그·`vercel.json` HTTP 헤더의 CSP 정책이 일치하는지 자동 검증하는 단위 테스트를 추가했습니다.
