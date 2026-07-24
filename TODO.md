# TODO — React ↔ 백엔드 실연동

React SPA를 실제 API Gateway에 연동하기 위한 작업 목록. 근거는 **(a) React 이전 js+html 버전의 실동작 연동 코드**(커밋 `5603cb9`, 이후 `01d6f03`에서 삭제됨 → 이 파일이 유일 기록)와 **(b) 실제 백엔드 소스 확인 결과**(`../crypto-project-backend`)다.

> **이 파일만 보고 작업 가능하도록** 각 항목에 정정값·근거 파일·구현 절차·필요한 레거시 코드를 인라인했다. 레거시 코드를 다시 열지 않아도 된다.
> 현재 React는 **UI 완성 + 부분 목(mock)** 상태다. 목 교체 대상은 `docs/MOCK_DATA.md`, 규칙은 `.claude/rules/backend-integration.md`.

---

## 0. 공통 계약 (모든 항목의 전제 · 백엔드 확인 완료)

- **단일 게이트웨이**: 모든 REST/WS는 `GATEWAY_URL`(`src/constants/api.ts` = `VITE_GATEWAY_URL`)로 나간다.
- **HTTP**: `apiClient`(`src/apis/apiClient.ts`, `withCredentials: true`). refresh 토큰은 httpOnly 쿠키(백엔드 Set-Cookie), access 토큰은 `sessionStorage`(`src/utils/authStorage.ts`).
- **STOMP prefix(백엔드 `websocket-gateway.yml` + `StompConfig.java`)**: 앱(전송) `/msg`, user `/user`, 브로커(구독) `/topic`·`/queue`. 엔드포인트 `/ws`(SockJS)·`/ws-native`(native) 둘 다 등록. **핸드셰이크 인증 = URL 쿼리 `?access_token=`**(gateway `WebsocketHandshakeAuthWebFilter`, 없으면 401).
- **커서 페이지네이션**: 응답 `{ items, hasNext }`. 다음 페이지는 마지막 항목 커서로 요청.
- **검증 에러**: 실패 응답 `response.data.errors = [{ field, message, code? }]`.
- **REST 엔드포인트 카탈로그**(모두 `GATEWAY_URL` prefix, `apiClient`):

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
  | 활동 보고 | `PUT /chat/room/{roomId}/activity` | `lastMsgSeq, lastMsgMs` | — |
  | 내 프로필 | `GET /user/me` | — | 200·304 |
  | 타 유저 프로필 | `GET /user/{userId}/profile` | — | 2xx |
  | 토큰 재발급 | `POST /auth/refresh` | 빈 body, 쿠키 | 201 + `Authorization` 헤더 |
  | 로그아웃 | `POST /auth/logout` | Bearer | 2xx |

---

## 1. 통신 계약 정정 (확정 — 백엔드 소스 확인 완료)

React 상수/경로가 백엔드와 어긋난 8건. **레거시 값이 정답**임을 백엔드 소스로 확인했다. 값만 바꾸면 되는 확정 작업.

- [x] **1.1 STOMP 전송 목적지** — `src/apis/chatStompApi.ts`
  - `CHAT_MESSAGE_SEND_DESTINATION`: `/app/chat.send` → **`/msg/chat.send`**
  - 근거: `websocket-gateway/.../StompConfig.java`(`setApplicationDestinationPrefixes`) + `git-config-repo/dynamic/websocket-gateway.yml`(`application-destination-prefix: /msg`) + `StompController.java`(`@MessageMapping("/chat.send")`).

- [x] **1.2 방 브로드캐스트 구독** — `src/apis/chatStompApi.ts`
  - `subscribeChatRoomMessages`: `/topic/chat/rooms/${roomId}` → **`/topic/chat/${roomId}`**
  - 근거: `common/common-core/.../StompDestination.java` → `CHAT_ROOM_PREFIX("/topic/chat/")`.

- [x] **1.3 배지 구독** — `src/apis/chatStompApi.ts`
  - `MY_CHAT_ROOM_BADGE_DESTINATION`: `/user/queue/my-chat-room-badge` → **`/user/queue/chat/badge`**
  - 근거: `StompDestination` → `CHAT_ROOM_BADGE_QUEUE("/queue/chat/badge")` + user prefix `/user`.

- [x] **1.4 ACK 구독** — 이미 `/user/queue/chat/ack` (일치 ✓, 변경 없음). 근거: `StompDestination.CHAT_ACK_QUEUE` + `@SendToUser("/queue/chat/ack")`.

- [x] **1.5 토큰 재발급** — `src/apis/apiClient.ts`
  - 경로 `/auth/reissue` → **`/auth/refresh`**.
  - 응답 파싱: body `{accessToken}` → **응답 `Authorization` 헤더**에서 `Bearer ` 제거 후 추출(성공 status 201).
  - 근거: `oauth2-client/.../web/AuthController.java` — `@PostMapping("${api-path.auth.refresh:/auth/refresh}")`, `ResponseEntity.status(CREATED).header(AUTHORIZATION, "Bearer "+token).header(SET_COOKIE, ...)`, `Access-Control-Expose-Headers: Authorization`.
  - 참고 파싱: `const h = res.headers['authorization']; const token = h?.startsWith('Bearer ') ? h.slice(7) : null;`

- [x] **1.6 방 나가기** — `src/apis/chatRoomApi.ts` `leaveChatRoom`
  - `DELETE /chat/room/${roomId}/members/me` → **`DELETE /chat/room/${roomId}/members`** (204)
  - 근거: `chat/.../web/ChatRoomController.java` `@DeleteMapping("${api-path.chat.room-members:/room/{roomId}/members}")`.

- [x] **1.7 방 수정** — `src/apis/chatRoomApi.ts` `updateChatRoom`
  - `PUT /chat/room/${roomId}` → **`PATCH /chat/room/${roomId}`** (부분 업데이트 바디, 204). 변경된 필드만 담아 보낸다.
  - 근거: `ChatRoomController.java` `@PatchMapping("${api-path.chat.room:/room/{roomId}}")`.

- [ ] **1.8 STOMP 핸드셰이크 인증** — `src/apis/stompClient.ts` → §3.1에서 함께 처리(토큰을 `connectHeaders`가 아니라 SockJS URL 쿼리로).

---

## 2. 인증 흐름 이식

- [ ] **2.1 401 single-flight refresh + 재시도 + 로그인 리다이렉트** — `src/apis/apiClient.ts`
  - 401 → refresh 1회(single-flight, `_retry`) → 원요청 재시도. refresh 경로 자체 401/재시도 초과 → 토큰 제거 + 돌아올 URL 저장 + 로그인 페이지.
  - 현재 React는 refresh를 하긴 하나 경로/응답(§1.5)이 틀렸고 single-flight·redirect 처리가 없다.
  - 레거시 참고(`auth-api.js`):
    ```js
    let refreshPromise = null, isRedirectingLogin = false;
    function refresh() {
      return axios.post(`${GATEWAY_URL}/auth/refresh`, {}, {
        withCredentials: true, validateStatus: (s) => s === 201,
      }).then((res) => {
        const h = res.headers.authorization || res.headers.Authorization;
        const token = h && h.startsWith('Bearer ') ? h.slice(7) : null;
        if (!token) throw new Error('No Access Token in refresh response');
        setAccessToken(token); return token;
      });
    }
    function ensureRefresh() {                 // single-flight
      if (refreshPromise) return refreshPromise;
      refreshPromise = refresh().finally(() => { refreshPromise = null; });
      return refreshPromise;
    }
    function redirectLoginOnce() {
      if (isRedirectingLogin) return; isRedirectingLogin = true;
      removeAccessToken(); saveRedirectUrl();  // sessionStorage['redirectAfterLogin'] = pathname+search
      alert('⚠️ [세션 만료] 로그인이 필요합니다');
      window.location.replace('/login');
    }
    // response interceptor:
    // if (!err.response || err.response.status !== 401) return reject;
    // if (url.includes('/auth/refresh') || original._retry) { redirectLoginOnce(); return reject; }
    // original._retry = true;
    // return ensureRefresh().then(t => { original.headers.Authorization = `Bearer ${t}`; return apiClient(original); })
    //                       .catch(() => { redirectLoginOnce(); return reject; });
    ```

- [ ] **2.2 로그인 성공 토큰 수신** — `src/pages/LoginSuccessPage.tsx`
  - 로그인 성공 시 백엔드가 SPA로 `?accessToken=`(URL 쿼리)로 access 토큰을 넘긴다. 이를 파싱→저장→저장해둔 redirect로 복귀.
  - 레거시 참고(`login-success.js`):
    ```js
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken') || getAccessToken();
    if (!accessToken) { alert('로그인 실패: 토큰 없음'); location.href = '/login'; return; }
    setAccessToken(accessToken);
    const redirect = consumeRedirectUrl();     // get+remove sessionStorage['redirectAfterLogin']
    if (redirect) { location.replace(redirect); return; }
    history.replaceState(null, '', '/login-success');  // URL에서 토큰 제거
    ```

- [ ] **2.3 로그인 시작 / 로그아웃** — `src/apis/authApi.ts`
  - 시작: `getOAuthLoginUrl(provider)` = `${GATEWAY_URL}/oauth2/authorization/{google|kakao}` (이미 존재 ✓). 버튼에서 `window.location.href`로 이동.
  - 로그아웃: `POST /auth/logout`(Bearer) → 토큰 제거 → 로그인 페이지 (이미 `logout()` 존재, 후처리 연결 확인).

- [ ] **2.4 앱 초기 사용자 로딩** — `src/App.tsx`
  - 초기 `user`를 `null`로 두고, 토큰 있으면 `getMyProfile()`(`GET /user/me`)로 채운다. (backend-integration.md 지적: 안 하면 모든 화면이 "로그인됨"으로 보임.)

---

## 3. STOMP 연결 이식

- [ ] **3.1 핸드셰이크 토큰 = URL 쿼리 + 재연결 재구독** — `src/apis/stompClient.ts`
  - 토큰을 STOMP `connectHeaders`가 아니라 **핸드셰이크 URL 쿼리 `?access_token=`**로 넘긴다. SockJS 사용 시: `new SockJS(GATEWAY_URL + '/ws?access_token=' + getAccessToken())`. (native 원하면 `new WebSocket(GATEWAY_URL.replace(/^http/,'ws') + '/ws-native?access_token=' + token)`.)
  - 재연결 시 기존 구독을 다시 걸어야 한다. 레거시는 topic→handler 맵을 두고 `onConnect`에서 재구독하는 싱글턴을 썼다. React는 페이지 `useEffect`에서 `createStompClient()`→`activate()`, cleanup에서 `deactivate()` 패턴(코드 스타일 규칙)이므로, **재구독은 각 페이지 effect가 재실행되며 처리**하거나 레거시식 싱글턴+topic맵을 도입할지 결정.
  - 레거시 참고(`stomp-client.js`, 재구독 핵심):
    ```js
    client = new StompJs.Client({
      webSocketFactory: () => new WebSocket(`${GATEWAY_URL.replace(/^http/,'ws')}/ws-native?access_token=${getAccessToken()}`),
      reconnectDelay: 5000,
      onConnect: () => { for (const [topic, e] of topics) if (e.handler && !e.sub)
                           e.sub = client.subscribe(topic, f => e.handler(JSON.parse(f.body))); },
      onWebSocketClose: () => topics.forEach(e => { e.sub = null; }),
    });
    // publish({destination, body, headers}) / subscribe(topic, handler) 에서 JSON.parse(frame.body)
    ```

---

## 4. 채팅 실시간 프로토콜 이식 (`ChatRoomPage.tsx` + `chatStompApi.ts`)

레거시 `websocket-stomp-chat.js`의 흐름. 낙관적 전송·ACK 재조정·재시도·중복제거가 핵심이라 그대로 이식한다.

- [ ] **4.1 낙관적 전송(optimistic send)**
  - `clientMessageId = uuid()` 생성 → pending 말풍선 즉시 표시 → `publish('/msg/chat.send', { clientMessageId, roomId, writerId: myId, content })` → pending 맵 저장 + `mySent`에 id 기록 + 3초 ACK 타이머.
  - 레거시:
    ```js
    const clientMessageId = uuidv4();
    // ...pending 말풍선 append...
    const timer = setTimeout(() => onTimeout(clientMessageId), 3000);
    pending.set(clientMessageId, { node, content, timer }); mySent.add(clientMessageId);
    stompClient.publish({ destination: '/msg/chat.send',
      body: JSON.stringify({ clientMessageId, roomId, writerId: myId, content }) });
    ```

- [ ] **4.2 ACK 처리** — 구독 `/user/queue/chat/ack`, payload `{ id, clientMessageId, success, ts, errors }`
    ```js
    function onAck({ id, clientMessageId, success, ts, errors }) {
      const e = pending.get(clientMessageId); if (!e) return;
      clearTimeout(e.timer);
      if (success) { /* 말풍선 sent, node.id=id, node.ts=ts */ pending.delete(clientMessageId); lastMsgSeq++; }
      else if (errors?.errors) { /* 말풍선 제거 + 필드별 토스트 */ 
        errors.errors.forEach(({code, field, message}) => toast(`${field}(${code}): ${message}`,'error'));
        pending.delete(clientMessageId);
      } else { /* markFailed → retry 버튼 노출 */ }
    }
    ```

- [ ] **4.3 타임아웃 + 재시도** — 3초 내 ACK 없으면 실패 표시, retry 시 같은 `clientMessageId`로 재publish + 타이머 재설정.
    ```js
    function retry(id) { const e = pending.get(id); if (!e) return;
      clearTimeout(e.timer); e.timer = setTimeout(() => onTimeout(id), 3000);
      stompClient.publish({ destination: '/msg/chat.send',
        body: JSON.stringify({ clientMessageId: id, roomId, writerId: myId, content: e.content }) }); }
    ```

- [ ] **4.4 브로드캐스트 수신 + 중복 제거** — 구독 `/topic/chat/${roomId}`. 내가 보낸 것은 `mySent`로 스킵.
    ```js
    function onBroadcast(message) {
      if (mySent.has(message.clientMessageId)) { mySent.delete(message.clientMessageId); return; }
      const distFromBottom = chatBox.scrollHeight - (chatBox.scrollTop + chatBox.clientHeight);
      appendMessage(message); lastMsgSeq++;
      if (distFromBottom <= 40) chatBox.scrollTop = chatBox.scrollHeight;   // 하단 근처면 오토스크롤
    }
    ```

- [ ] **4.5 초기 로딩 순서** — `loadMyProfile()`(myId) → `GET /chat/room/{roomId}`(`room.msgCnt`→`lastMsgSeq`) → `GET /chat/room/{roomId}/messages`(최신) → 렌더 후 최하단 스크롤.

- [ ] **4.6 이전 메시지 커서 로딩 + 스크롤 보정** — scrollTop 0에서 `GET .../messages?limit&lastId&lastCreatedAtMillis`(첫 항목 커서), prepend 후 스크롤 위치 보존.
    ```js
    const prevScrollHeight = chatBox.scrollHeight, prevScrollTop = chatBox.scrollTop;
    items.forEach(prependMessage);
    chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeight + prevScrollTop;
    ```

- [ ] **4.7 활동/읽음 보고** — `beforeunload`에서 `PUT /chat/room/{roomId}/activity?lastMsgSeq=..&lastMsgMs=..`. 언로드 유실 방지 위해 `fetch(keepalive:true)` + `Authorization` 헤더 수동.
    ```js
    fetch(`${GATEWAY_URL}/chat/room/${roomId}/activity?lastMsgSeq=${lastMsgSeq}&lastMsgMs=${lastTs ?? 0}`,
      { method: 'PUT', headers: { authorization: `Bearer ${getAccessToken()}` }, keepalive: true }).catch(()=>{});
    ```

- [ ] **4.8 타 유저 프로필 캐시** — 아바타 닉네임용 `GET /user/{userId}/profile`을 캐시 + in-flight dedup. 현재 `userApi.ts`엔 없음 → 추가.
    ```js
    const profileCache = new Map(), inFlight = new Map();
    function ensureProfile(userId) {
      if (profileCache.has(userId)) return Promise.resolve(profileCache.get(userId));
      if (inFlight.has(userId)) return inFlight.get(userId);
      const req = apiClient.get(`/user/${userId}/profile`).then(r => r.data)
        .then(p => (profileCache.set(userId, p), p)).finally(() => inFlight.delete(userId));
      inFlight.set(userId, req); return req;
    }
    ```

- [ ] **4.9 내 채팅방 목록 배지** — `MyChatRoomPage`에서 구독 `/user/queue/chat/badge` payload `{ id, lastMsgContent, lastMsgCreatedAt }` → 해당 방 카드 맨 앞으로 이동 + 마지막 메시지/안읽음 갱신(레거시 `onBadge`). 방이 목록에 없으면 `GET /chat/room/{id}/me`로 만들어 prepend.

---

## 5. 참고 (현재 React 파일 배치 · 관련 문서)

- 통신: `src/apis/{apiClient,authApi,stompClient,chatStompApi,chatRoomApi,chatMessageApi,userApi}.ts`, `src/constants/api.ts`.
- 유틸: `src/utils/{authStorage,chatMessageUtils,dateFormatter,userMapper,...}.ts`. 토큰 저장은 `authStorage.ts`.
- 화면: `src/pages/*`(ChatRoomPage·MyChatRoomPage·LoginSuccessPage·CreateChatRoomPage·UpdateChatRoomPage 등).
- 문서: 구조 `docs/ARCHITECTURE.md`, 화면 `docs/PAGES.md`, 계약 `docs/API_CONTRACT.md`, 인증 `docs/AUTH.md`, 목 교체 대상 `docs/MOCK_DATA.md`, 규칙 `.claude/rules/backend-integration.md`.
- 검증: 각 단계 후 `npm run build`(타입체크) + `npm run lint`. 가능하면 게이트웨이 띄우고 `npm run dev`로 플로우 확인.
- 백엔드 계약 원천(다른 저장소 `../crypto-project-backend`): STOMP `common-core/.../StompDestination.java`·`websocket-gateway/.../StompConfig.java`, 재발급 `oauth2-client/.../AuthController.java`, 채팅 REST `chat/.../ChatRoomController.java`, 라우팅 `git-config-repo/dynamic/api-gateway.yml`.
