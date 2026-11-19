# Issue #120: 문서 언어 오지정 및 API 키 팝오버 대화상자 접근성 누락

## 배경 및 원인
1. **문서 언어 속성 (`index.html`)**: 한국어 UI 서비스에서 `<html lang="en">`으로 지정된 경우 스크린리더가 잘못된 발음 규칙을 적용할 수 있습니다. (확인 결과 현재 `index.html`은 이미 `<html lang="ko">`로 수정되어 있음을 검증했습니다.)
2. **API 키 설정 팝오버 접근성 누락 (`src/components/ApiKeySettings.tsx`, CA-009)**: 팝오버 컨테이너에 `role="dialog"` 시맨틱이 없어 `aria-label`이 무시되고, 열림 시 포커스 이동·`Escape` 닫기·닫힘 시 트리거 버튼 포커스 복귀가 구현되어 있지 않았습니다.

## 해결 내용
- **`src/components/ApiKeySettings.tsx`**
  - 팝오버 컨테이너를 시맨틱 `<dialog open>` 태그로 교체하고, 트리거 버튼에 `aria-haspopup="dialog"`를 추가했습니다.
  - `useEffect`와 `useRef`(`triggerButtonRef`, `keyInputRef`, `wasOpenRef`)를 통해 팝오버가 열릴 때 API Key 입력창(`#gemini-api-key-input`)으로 포커스를 이동하고, `Escape` 키 입력 시 팝오버를 닫으며, 닫힐 때 트리거 버튼으로 포커스가 복귀되도록 구현했습니다.
- **`tests/ApiKeySettings.test.tsx`**
  - `role="dialog"` 렌더링, 열림 시 입력창 포커스 이동, `Escape` 키 닫힘 및 트리거 버튼 포커스 복귀 단위 테스트를 추가했습니다.
