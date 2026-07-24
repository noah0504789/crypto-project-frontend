# LEGACY_JS_INTEGRATION — React 이전(js+html)의 백엔드 연동 참고

> - **목적**: React로 옮기기 전 순수 **js+html 버전이 실제 백엔드(API Gateway)와 어떻게 연동했는지**를 정리해, 현재 React를 실 백엔드에 붙일 때 참고하기 위한 문서다.
> - **출처 스냅샷**: 커밋 `5603cb9`의 `assets/js/*.js`(React 마이그레이션 직전). 이 코드는 **당시 백엔드와 실제로 통신하던 동작 코드**다(목데이터 아님). 이후 `01d6f03 [refactor] old 파일 삭제`에서 제거됨.
> - **읽는 법**: §2~§7은 레거시가 한 방식(사실), §8은 **현재 React 코드와의 차이(중요)**, §9는 이식 체크리스트.
> - 레거시가 곧 정답은 아니다. 다만 "실제로 통신했던 값"이므로, React 현재 값과 다르면 **실 백엔드 계약으로 재확인**한다.

## 1. 스택 개요 (레거시)

- 페이지별 `*.html` + `assets/js/*.js`(ES 모듈), `axios`(CDN 전역)·`@stomp/stompjs`(전역 `StompJs`)·`SockJS`/native `WebSocket`.
- 상태관리 라이브러리 없음. 각 페이지 스크립트가 DOM을 직접 그림.
- 단일 게이트웨이(`GATEWAY_URL`)로 모든 REST/WS 통신.

## 2. 공통 기반

- **게이트웨이 단일 진입**: `config.js`의 `GATEWAY_URL = 'https://localhost:8000'`(하드코딩). → React는 `import.meta.env.VITE_GATEWAY_URL`(`.env`)로 개선됨.
- **기본 채팅 카테고리**: `DEFAULT_CHAT_CATEGORY = 'CRYPTO_CURRENCY'`.
- `utils.js`: `formatLocaleDateTime(ts)`, `uuidv4()`(clientMessageId 생성), `toQueryString`, `escapeCss`, `createButton`.

## 3. 인증 연동 (`auth-api.js`, `login.js`, `login-success.js`)

- **axios 인스턴스**: `axios.create({ withCredentials: true })` — refresh 토큰 쿠키(httpOnly)를 자동 동봉.
- **access token 저장**: `sessionStorage['accessToken']`. `get/set/remove/hasAccessToken` 헬퍼.
- **요청 인터셉터**: 토큰 있으면 `Authorization: Bearer <token>` 부착.
- **응답 인터셉터(401 재발급)**:
  - 401이면 원요청을 1회 재시도(`_retry` 플래그).
  - 재발급: `POST ${GATEWAY_URL}/auth/refresh`(빈 body, `withCredentials`, **status 201만 성공**). 새 access는 **응답 `Authorization` 헤더**(`Bearer ...`)에서 꺼낸다(`pickBearer`).
  - **single-flight**: `refreshPromise`로 동시 401을 하나의 refresh로 합침.
  - refresh 경로 자체가 401이거나 이미 재시도했으면 → `redirectLoginOnce`(토큰 제거 + 돌아올 URL 저장 + alert + 로그인 페이지로 `replace`).
- **로그인 시작**(`login.js`): `window.location.href = ${GATEWAY_URL}/oauth2/authorization/{google|kakao}`.
- **로그인 성공**(`login-success.js`): URL 쿼리 `?accessToken=`을 읽어 `setAccessToken` → 저장해둔 redirect로 복귀(`consumeRedirectUrl`). (백엔드가 access token을 URL 쿼리로 넘기는 방식 — 백엔드 TODO 1.5와 연결.)
- **로그아웃**: `POST /auth/logout`(Bearer 헤더) → 토큰 제거 → 로그인 페이지.

## 4. STOMP(WebSocket) 연동 (`stomp-client.js`)

- **핸드셰이크 인증 = 쿼리 파라미터 토큰**:
  - 사용: native `WebSocket(${GATEWAY_URL→ws}/ws-native?access_token=<token>)`.
  - 주석 대안: SockJS `${GATEWAY_URL}/ws?access_token=<token>`.
  - 즉 **토큰을 STOMP `connectHeaders`가 아니라 핸드셰이크 URL 쿼리 `access_token`으로** 넘긴다(게이트웨이 `WebsocketHandshakeAuthWebFilter`가 쿼리에서 인증).
- **싱글턴 클라이언트**: 지연 `activate()`. `reconnectDelay: 5000`.
- **재연결 시 재구독**: `onConnect`에서 등록된 topic들을 다시 `subscribe`. `onWebSocketClose`에서 sub 핸들 초기화.
- **API**: `stompClient.publish({destination, body, headers})`, `stompClient.subscribe(topic, handler)`(프레임 body를 `JSON.parse`해 전달), `connected()`.
- `beforeunload`에서 `deactivate()`.

## 5. 채팅 실시간 프로토콜 (`websocket-stomp-chat.js`)

핵심. React 채팅 화면 구현 시 이 흐름을 그대로 참고한다.

**구독**
- `/user/queue/chat/ack` → 내 전송의 ACK.
- `/topic/chat/{roomId}` → 방 브로드캐스트(모든 참여자 수신).
- (목록 화면 `my-chat-room.js`) `/user/queue/chat/badge` → 안읽음/마지막 메시지 배지.

**낙관적 전송(optimistic send)**
1. `clientMessageId = uuidv4()` 생성, 화면에 `pending` 말풍선 즉시 추가.
2. `publish('/msg/chat.send', { clientMessageId, roomId, writerId: myId, content })`.
3. `pending` 맵에 저장 + `mySent`에 clientMessageId 기록. `ACK_TIMEOUT_MS=3000` 타이머.
4. **ACK 수신**(`onAck`): `{ id, clientMessageId, success, ts, errors }`
   - `success` → 말풍선 `sent`로, 실제 `id`·`ts` 반영, `lastMsgSeq++`, pending 삭제.
   - `errors.errors`(검증 실패) → 말풍선 제거 + 필드별 토스트(`{code, field, message}`).
   - 그 외 → `failed` 표시(+retry 버튼).
5. **타임아웃**: 3초 내 ACK 없으면 `failed` → `retry(clientMessageId)`로 재publish.
6. **브로드캐스트 중복 제거**(`onBroadcast`): 들어온 메시지의 `clientMessageId`가 `mySent`에 있으면(내가 보낸 것) 스킵. 아니면 append + (하단 근처면) 오토스크롤.

**메시지 로딩 / 페이지네이션**
- 초기: `loadMyProfile()`(myId) → `loadChatroom()`(`room.msgCnt`→lastMsgSeq) → `loadLatestChatmessage()`.
- 위로 스크롤(scrollTop 0) → `loadPrevChatMessage()`가 커서로 이전 메시지 로드, **스크롤 위치 보정**.

**활동/읽음 보고**
- `beforeunload`에서 `PUT /chat/room/{roomId}/activity?lastMsgSeq=..&lastMsgMs=..`를 `fetch(keepalive:true)` + `Authorization` 헤더 수동으로 전송(언로드 중 유실 방지).

**프로필 캐시**(아바타 닉네임): `ensureProfile(userId)` = `GET /user/{userId}/profile`를 `profileCache` + `inFlight`(동시요청 dedup)로 캐싱.

## 6. REST 엔드포인트 카탈로그 (레거시가 실제 호출한 것)

모두 `apiClient`(= `GATEWAY_URL` prefix + Bearer + 401 refresh) 사용. 커서 응답은 `{ items, hasNext }`.

| 기능 | Method · Path | params / body | 성공 status |
|---|---|---|---|
| 인기 채팅방 | `GET /chat/rooms/popular` | `limit, category, lastId, lastPopularity` | 2xx |
| 내 채팅방 목록 | `GET /chat/rooms/me` | `limit, lastUnreadFlag, lastMsgCreatedAt, lastId` | 2xx |
| 내 채팅방 단건 | `GET /chat/room/{roomId}/me` | — | 2xx |
| 방 상세 | `GET /chat/room/{roomId}` | — | 200 |
| 방 메시지 | `GET /chat/room/{roomId}/messages` | `limit, lastId, lastCreatedAtMillis` | 2xx |
| 방 생성 | `POST /chat/room` | `{title, description, category}` | 201 |
| 방 수정 | `PATCH /chat/room/{roomId}` | 변경 필드만 `{title?, description?, category?}` | 204 |
| 방 입장(가입) | `POST /chat/room/{roomId}/members` | — | 201·204 |
| 방 나가기 | `DELETE /chat/room/{roomId}/members` | — | 204 |
| 활동 보고 | `PUT /chat/room/{roomId}/activity` | `lastMsgSeq, lastMsgMs` (fetch keepalive) | — |
| 내 프로필 | `GET /user/me` | — | 200·304 |
| 타 유저 프로필 | `GET /user/{userId}/profile` | — | 2xx |
| 토큰 재발급 | `POST /auth/refresh` | 빈 body, 쿠키 | 201(+`Authorization` 헤더) |
| 로그아웃 | `POST /auth/logout` | Bearer | 2xx |

## 7. 페이지네이션 · 검증 계약

- **커서 페이지네이션**: 응답 `{ items, hasNext }`. 다음 페이지는 마지막 항목의 커서 필드(`lastId` + 도메인별 보조 커서: popular=`lastPopularity`, my=`lastUnreadFlag`+`lastMsgCreatedAt`, messages=`lastCreatedAtMillis`)로 요청.
- **필드 검증 에러**: 실패 응답 body `{ errors: [{ field, message, code? }] }`. 폼에서 필드별로 표시(`room-form.js`의 `bindFieldErrors`).

## 8. 현재 React 코드와의 차이 (중요 — 붙이기 전 확인)

아래는 **레거시(당시 실동작)** ↔ **현재 React**를 직접 대조한 결과다. 여러 값이 어긋나 있어, 지금 React를 그대로 붙이면 통신이 실패할 수 있다. 특히 STOMP 목적지와 토큰 재발급은 **백엔드 계약(external-contracts) 기준으로 레거시가 맞고 React가 어긋난 것으로 보인다**.

| 항목 | 레거시 (실동작) | 현재 React | 비고 |
|---|---|---|---|
| 토큰 재발급 | `POST /auth/refresh`, 새 토큰 = **응답 `Authorization` 헤더**, 201 | `apiClient.ts`: `POST /auth/reissue`, 토큰 = **body `{accessToken}`** | 백엔드는 `/auth/refresh` + Authorization 헤더(oauth2-client §6.2). **React 재확인 필요** |
| STOMP 핸드셰이크 인증 | 토큰 = 핸드셰이크 URL **쿼리 `?access_token=`** | `stompClient.ts`: SockJS `/ws` + **`connectHeaders.Authorization`** | 게이트웨이는 쿼리에서 인증. **React 방식 미동작 가능** |
| 메시지 전송 목적지 | `/msg/chat.send` | `chatStompApi.ts`: `/app/chat.send` | 백엔드 계약 `/msg/chat.send`. **React 어긋남** |
| 방 브로드캐스트 구독 | `/topic/chat/{roomId}` | `/topic/chat/rooms/{roomId}` | 백엔드 `/topic/chat/{roomId}`. **React 어긋남** |
| 배지 구독 | `/user/queue/chat/badge` | `/user/queue/my-chat-room-badge` | 백엔드 `/queue/chat/badge`. **React 어긋남** |
| ACK 구독 | `/user/queue/chat/ack` | `/user/queue/chat/ack` | 일치 ✓ |
| 방 나가기 | `DELETE /chat/room/{roomId}/members` | `DELETE /chat/room/{roomId}/members/me` | 경로 차이 — 재확인 |
| 방 수정 | `PATCH /chat/room/{roomId}` (부분) | `PUT /chat/room/{roomId}` | 메서드 차이 — 재확인 |
| 게이트웨이 URL | 하드코딩 `https://localhost:8000` | `.env` `VITE_GATEWAY_URL` | React가 개선 ✓ |

> 위 STOMP 목적지 4종·`/auth/refresh`는 백엔드 `external-contracts`/`OAUTH2_CLIENT` 계약과 대조 시 레거시 값이 일치한다. React 상수를 여기에 맞추는 것을 우선 검토하되, 최종은 실 백엔드로 확인한다.

## 9. React 이식 체크리스트

- [ ] STOMP 목적지 상수 정정: send `/msg/chat.send`, broadcast `/topic/chat/{roomId}`, badge `/user/queue/chat/badge`(ack는 유지).
- [ ] STOMP 핸드셰이크 토큰을 **쿼리 `?access_token=`**로 전달(연결 방식이 native `/ws-native`인지 SockJS `/ws`인지 백엔드와 확인).
- [ ] 토큰 재발급 경로/응답 위치 확인(`/auth/refresh` + `Authorization` 헤더 vs 현재 `/auth/reissue` + body).
- [ ] 401 single-flight refresh + `_retry` + 로그인 리다이렉트(돌아올 URL 저장) 흐름 이식.
- [ ] 로그인 성공 시 `?accessToken=` 파싱 → 저장 → redirect 복귀.
- [ ] 채팅 낙관적 전송 프로토콜(clientMessageId·ACK·타임아웃/retry·브로드캐스트 dedup) 이식.
- [ ] 이전 메시지 커서 로딩 + 스크롤 위치 보정.
- [ ] `beforeunload` 활동 보고(`PUT .../activity`, fetch keepalive).
- [ ] 타 유저 프로필 캐시(`GET /user/{id}/profile`, in-flight dedup) — 현재 `userApi.ts`에 없음.
- [ ] REST 메서드/경로 차이(나가기·수정) 백엔드 확인 후 정정.

## 10. 관련 문서

- 현재 React 구조/화면/계약: [`ARCHITECTURE.md`](ARCHITECTURE.md), [`PAGES.md`](PAGES.md), [`API_CONTRACT.md`](API_CONTRACT.md), [`AUTH.md`](AUTH.md), [`UTILITIES.md`](UTILITIES.md)
- 백엔드 계약(다른 저장소): STOMP/JWT/쿠키 계약은 backend `.claude/rules/external-contracts.md`·`docs/modules/OAUTH2_CLIENT.md`·`API_GATEWAY.md` 참고.
