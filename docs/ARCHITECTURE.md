# ARCHITECTURE

프론트엔드의 구조·계층·의존 방향·핵심 패턴. 개별 화면은 `docs/PAGES.md`, 유틸 계층은 `docs/UTILITIES.md`, 인증은 `docs/AUTH.md`, 백엔드 계약은 `docs/API_CONTRACT.md`.

## 설계 원칙
1. **단일 게이트웨이 통신** — 모든 REST/WebSocket은 `GATEWAY_URL`(API Gateway) 한 곳으로 나간다. 서비스별 호스트를 프론트가 알지 않는다.
2. **계층 분리** — 화면(pages/components) → 통신(apis) → 순수 로직(utils/types). 상위가 하위에 의존하고 역방향은 없다.
3. **서버 타입과 화면 모델 분리** — 서버 DTO(`*Response`/`*Event`)를 화면 모델(`User`/`ChatMessage`/`*Form`)로 매퍼에서 변환한다(anti-corruption layer). 백엔드 변경을 매퍼가 흡수한다.
4. **얇은 전역 상태** — 상태 라이브러리 없이 `App.tsx`가 최소한의 전역 상태(user, notifications)만 보유하고 props로 내린다. 나머지는 페이지 로컬 상태.
5. **관심사별 파일 규칙** — 도메인마다 `apis/{d}Api.ts` + `types/{d}.ts` + (필요 시) `utils/{d}Mapper.ts`로 대응시킨다.

## 스택 / 빌드
- **React 19** 함수 컴포넌트 + Hooks (클래스 컴포넌트 없음)
- **Vite 8** (`vite.config.ts`: `@`→`src` alias, `global: globalThis`는 sockjs용)
- **TypeScript** (`tsconfig.app.json`, `verbatimModuleSyntax` → 타입 import는 `import type` 필수, `noUnusedLocals/Parameters`)
- **react-router-dom v7** (`BrowserRouter`)
- **axios**(REST) / **@stomp/stompjs + sockjs-client**(WebSocket)
- 빌드: `tsc -b && vite build` — **타입 에러가 있으면 빌드 실패**(사실상 타입체크가 CI 게이트)

## 계층 구조와 의존 방향
```
        ┌───────────────────────────────────────────┐
        │  main.tsx → App.tsx (라우팅 + 전역 상태)   │
        └───────────────────────────────────────────┘
                 │ props                     │ props
                 ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │  pages/*        │  uses  │  components/*     │
        │ (라우트 화면)   │───────▶│ (재사용 UI)       │
        └─────────────────┘        └──────────────────┘
                 │ 호출
                 ▼
        ┌─────────────────────────────────────────────┐
        │  apis/*  (통신 계층)                          │
        │   apiClient(axios) · stompClient(STOMP)       │
        │   {domain}Api · chatStompApi                  │
        └─────────────────────────────────────────────┘
                 │ 변환/사용                 │ 사용
                 ▼                           ▼
        ┌─────────────────┐        ┌──────────────────┐
        │  utils/*        │        │  types/*         │
        │ (순수 함수·매퍼)│        │ (도메인/DTO 타입) │
        └─────────────────┘        └──────────────────┘
                                   │
                                   ▼
                          constants/api.ts (GATEWAY_URL)
```
**의존 규칙**: `pages/components` → `apis` → `utils/types`. `utils`는 React·네트워크에 의존하지 않는 순수 함수. `apis`는 UI를 import하지 않는다. 이 방향을 깨는 import(예: 컴포넌트에서 axios 직접 호출, utils에서 컴포넌트 import)는 금지.

## 디렉토리 구조
```
src/
  main.tsx              # 엔트리. BrowserRouter로 App 감쌈
  App.tsx               # 라우트 정의 + 전역 상태(user, notifications)
  constants/api.ts      # GATEWAY_URL (import.meta.env.VITE_GATEWAY_URL)
  apis/                 # 통신 계층 (REST/STOMP)
  types/                # 도메인 타입 + 서버 요청/응답 타입
  utils/                # 순수 함수: 매퍼·포매터·스토리지·검증  → docs/UTILITIES.md
  components/           # 재사용 UI (폴더당 .tsx + .css)
  pages/                # 라우트 단위 화면 (단일 파일 또는 폴더)  → docs/PAGES.md
  assets/               # 이미지
```
파일 컨벤션: 재사용 컴포넌트는 `components/Xxx/Xxx.tsx`+`Xxx.css`. 페이지는 단순하면 `pages/Xxx.tsx`, 하위 라우트가 있으면 `pages/Xxx/Xxx.tsx`.

## 상태 관리 아키텍처
전역 상태 라이브러리 없음. **`App.tsx`가 전역 상태의 단일 원천**:
- `user: User | null` — 로그인 사용자. 모든 페이지에 props 전달. 갱신은 `setUser`(예: 프로필 수정 후 `onUserUpdated`).
- `notifications: Notification[]` — 실시간 알림 누적. `Header`가 소비.

그 외는 **페이지 로컬 `useState`**로 관리(목록·폼·연결상태 등). 라우트 가드 컴포넌트는 없고, 각 페이지가 `user === null`이면 안내 카드를 직접 렌더한다.

> 트레이드오프: 앱 규모가 작고 공유 상태가 적어 props drilling으로 충분하다. 공유 서버 상태(목록 캐시 등)가 늘면 데이터 패칭 라이브러리(React Query 등) 도입을 검토할 지점.

## 통신 아키텍처

### REST — `apis/apiClient.ts` 중심
- `apiClient`(axios) 하나에 **요청/응답 인터셉터**를 걸어 인증을 횡단 처리한다:
  - 요청: `getAccessToken()`으로 `Authorization: Bearer` 자동 첨부.
  - 응답: 401 시 `/auth/reissue`로 재발급 → 원요청 1회 재시도(`_retry` 플래그로 무한루프 방지). 상세 `docs/AUTH.md`.
- 도메인 API 함수(`{domain}Api.ts`)는 `apiClient`만 쓰면 토큰/재발급을 신경 쓸 필요가 없다. **컴포넌트는 axios/fetch를 직접 호출하지 않는다.**
- `baseURL = GATEWAY_URL`, `withCredentials: true`(refresh 쿠키).

### 실시간 — `apis/stompClient.ts` + `apis/chatStompApi.ts`
- 전송: STOMP over SockJS, 엔드포인트 `GATEWAY_URL/ws`. `createStompClient()`가 토큰을 connectHeaders에 실어 `Client`를 만든다(자동 재연결 `reconnectDelay: 5000`).
- 구독/발행 로직은 `chatStompApi.ts` 헬퍼로 캡슐화(페이지는 destination 문자열을 직접 다루지 않음):
  | 방향 | destination | 용도 |
  | --- | --- | --- |
  | 발행 | `/app/chat.send` | 메시지 전송 |
  | 구독 | `/topic/chat/rooms/{roomId}` | 방 메시지 브로드캐스트 |
  | 구독 | `/user/queue/chat/ack` | 전송 결과 ACK |
  | 구독 | `/user/queue/my-chat-room-badge` | 내 채팅방 안읽음 뱃지 |
- 라이프사이클: 페이지 `useEffect`에서 `activate()`, cleanup에서 `deactivate()`. 방/유저 의존성 변화 시 재연결.
- ⚠️ STOMP에는 REST 같은 401 자동 재발급이 없다(연결 시점 토큰 만료 시 재연결만 반복). 개선 여지 — `docs/AUTH.md`.

## 요청 라이프사이클 (예: 인기 채팅방 조회)
```
ChatPage(useEffect)
  → getPopularChatRooms()            (apis/chatRoomApi.ts)
    → apiClient.get('/chat/rooms/popular', {params})
      → [요청 인터셉터] Authorization 첨부
      → API Gateway → chat 서비스
      ← 200 { items, hasNext }   (또는 401 → 재발급 → 재시도)
  → setState(items, hasNext)         (페이지 로컬 상태)
  → 렌더 (필요 시 utils/dateFormatter로 표기 변환)
```

## 핵심 아키텍처 패턴
프로젝트 전반에서 반복되는 패턴. 새 코드도 이 패턴을 따른다.

- **Anti-corruption 매퍼 계층** — 서버 타입 ↔ 화면 모델 변환을 `utils/*Mapper.ts`에 격리. 화면은 서버 DTO 형태에 직접 의존하지 않는다. (`docs/UTILITIES.md`)
- **커서 페이지네이션** — 모든 목록이 오프셋이 아닌 커서 방식. 마지막 아이템의 정렬키를 다음 요청 커서로 전달.
  - 인기 채팅방: `lastId` + `lastPopularity`
  - 내 채팅방: `lastUnreadFlag` + `lastMsgCreatedAt` + `lastId`
  - 채팅 메시지: `lastId` + `lastCreatedAtMillis`(위로 스크롤 → 이전 메시지 prepend + 스크롤 위치 보정)
- **낙관적 UI(채팅 전송)** — 전송 즉시 `pending` 메시지를 붙이고 `clientMessageId`로 서버 브로드캐스트와 매칭해 치환. ACK 실패/발행 실패 시 `failed` + 재전송. 상태 모델 `pending → sent | failed`.
- **인터셉터 기반 횡단 관심사** — 인증(토큰 첨부/재발급)을 각 호출이 아니라 `apiClient` 한 곳에서 처리.
- **비동기 이펙트 취소** — 데이터 로딩 `useEffect`는 `isCancelled` 플래그로 언마운트 후 setState 방지.
- **낙관적 갱신 후 로컬 동기화** — 프로필 수정·가격 알림 저장은 서버 성공 후 재조회 없이 로컬 상태를 갱신(불필요한 재요청 회피).

## 환경/설정
- `VITE_GATEWAY_URL`(`.env`) → `constants/api.ts`의 `GATEWAY_URL`로만 접근. 코드에서 `import.meta.env`를 직접 흩뿌리지 않는다.
- 타임존: 표시용 시간은 전부 `Asia/Seoul`(`utils/dateFormatter.ts`).

## 확장 가이드 (새 기능 추가 시)
| 추가하려는 것 | 두는 곳 |
| --- | --- |
| 새 화면 | `pages/`, 라우트는 `App.tsx`. (로그인 필요 시 `user===null` 안내 처리) |
| 새 REST 도메인 | `apis/{domain}Api.ts`(`apiClient` 사용) + `types/{domain}.ts` |
| 서버↔화면 형태 차이 | `utils/{domain}Mapper.ts` |
| 새 STOMP 구독/발행 | `apis/chatStompApi.ts`(또는 도메인별 stompApi), destination은 상수화 |
| 재사용 UI | `components/Xxx/` |
| 전역으로 공유할 상태 | 신중히. 우선 상위 페이지 지역 상태 → 정말 전역이면 `App.tsx` |

세부 규칙은 `.claude/rules/code-style.md`, 목→실연동은 `.claude/rules/backend-integration.md` + `docs/MOCK_DATA.md`.
