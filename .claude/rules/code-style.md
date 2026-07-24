# CODE STYLE

이 코드베이스에서 관찰되는 규칙. 새 코드는 이를 따르고, 수정 시 대상 파일의 기존 스타일을 우선한다.

## 언어/타입
- `type`만 사용(`interface` 안 씀). props 타입은 컴포넌트 파일 상단에 `type XxxProps = {...}`.
- 고정 문자열 집합은 `as const` 배열 + 파생 유니온 타입:
  ```ts
  export const CHAT_ROOM_CATEGORIES = ['CRYPTO_CURRENCY'] as const;
  export type ChatRoomCategory = (typeof CHAT_ROOM_CATEGORIES)[number];
  ```
- 타입 전용 import는 `import type { ... }`(`verbatimModuleSyntax` 켜져 있어 필수).
- 런타임 타입 좁히기는 커스텀 가드 함수 사용(예: `isChatRoomCategory`, `isPriceAlertTargetChangeRatePercent`).

## import
- 절대경로 alias `@/`(= `src/`)를 쓴다. `import { apiClient } from '@/apis/apiClient'`. 상대경로는 같은 폴더의 CSS(`import './Xxx.css'`) 정도에만.

## 컴포넌트
- 함수 컴포넌트 + Hooks. `export default function Name(...)`.
- 파일 구조: 재사용 컴포넌트는 `components/Xxx/Xxx.tsx` + `Xxx.css`. **페이지도 디렉토리 단위**로 `pages/XxxPage/XxxPage.tsx` + (있으면) `XxxPage.css`. CSS는 같은 폴더 상대 import(`import './XxxPage.css'`).
- 이벤트 핸들러는 `handleXxx`, 콜백 props는 `onXxx`.
- 로딩 버튼은 공용 `LoadingButton`(`isLoading`, `loadingText`) 사용.

## 상태/이펙트
- 비동기 로드 `useEffect`는 `isCancelled` 플래그로 언마운트 후 setState 방지(기존 페이지 패턴 참고).
- STOMP 클라이언트는 `useEffect`에서 `createStompClient()` → `client.activate()`, cleanup에서 `client.deactivate()`. 방/유저 의존성 배열 주의.
- 리스트 추가/수정은 불변 업데이트(`prev => [...prev, x]`, `prev.map(...)`).

## API 계층
- 컴포넌트에서 `axios`/`fetch`를 직접 호출하지 않는다. `src/apis/*`의 함수를 통한다.
- 새 도메인 API는 `src/apis/{domain}Api.ts` 파일로 만들고 `apiClient`를 쓴다(토큰/재발급 인터셉터가 붙음).
- 서버 요청/응답 타입은 `src/types/`에 두고, 화면 모델과 다르면 `src/utils/{domain}Mapper.ts`로 변환.

## 네이밍
- 서버 응답 타입: `XxxResponse`, 서버 이벤트: `XxxEvent`, 화면 폼 모델: `XxxForm`.
- 커서 타입: `XxxCursor`.
- 상수는 `SCREAMING_SNAKE_CASE`(예: `POPULAR_CHAT_ROOM_LIMIT`, `MESSAGE_LIMIT`).

## UI 텍스트
- 사용자 노출 문자열은 한국어. 코드 식별자·주석 키워드는 영어 혼용.
- 사용자 피드백은 `alert()`/`window.confirm()` 사용(현 코드 관례). 새 코드도 일단 이 관례를 따르되, 별도 요청 시 토스트 등으로 개선.

## 주석
- 최소화. "무엇"보다 "왜"가 필요할 때만. 타입에 붙는 도메인 규칙 주석은 유지(예: `targetChangeRate 0.03 = 3%`).
