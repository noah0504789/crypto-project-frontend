# TODO — React ↔ 백엔드 실연동

React SPA를 실제 API Gateway에 연동하기 위한 작업 목록. 근거는 **(a) React 이전 js+html 버전의 실동작 연동 코드**(커밋 `5603cb9`, 이후 `01d6f03`에서 삭제됨 → 이 파일이 유일 기록)와 **(b) 실제 백엔드 소스 확인 결과**(`../crypto-project-backend`)다.

> **이 파일만 보고 작업 가능하도록** 각 항목에 근거 파일·구현 절차·필요한 레거시 코드를 인라인했다. 레거시 코드를 다시 열지 않아도 된다.
> 현재 React는 **UI 완성 + 부분 목(mock)** 상태다. 목 교체 대상은 `docs/MOCK_DATA.md`, 규칙은 `.claude/rules/backend-integration.md`.
> **통신 계약(REST/STOMP 경로·payload·status·인증)의 정본은 `docs/API_CONTRACT.md`**다. 아래 태스크의 엔드포인트/destination/payload 값은 그 문서를 기준으로 삼는다.

## 진행 현황(요약)

- **완료**: **인증 흐름 §2 전체**(2.1 apiClient refresh + 세션 만료 이벤트, 2.2 LoginSuccessPage, 2.3 로그인 시작/로그아웃, 2.4 앱 초기 사용자 로딩), STOMP 핸드셰이크 3.1, 채팅 실시간 핵심 4.1(낙관적 전송)·4.2(ACK)·4.4(브로드캐스트+중복제거)·4.6(이전 메시지 로딩).
- **남은 핵심**: 채팅 §4 마감(4.3·4.5·4.7·4.8·4.9). 그 외 가격 알림·홈·알림 실시간은 `docs/MOCK_DATA.md` §2·5·6.
- **부분/미완**: 4.3 ACK 3초 타임아웃(재전송만 있음), 4.5 방 상세(제목/msgCnt) 미조회(`roomTitle` 하드코딩, MOCK_DATA #4), 4.7 활동/읽음 보고, 4.8 아바타 프로필 캐시 페이지 연결, 4.9 배지 목록 재정렬/미존재 방 prepend.

---

## 0~1. 통신 계약 (→ `docs/API_CONTRACT.md`로 이관 완료)

공통 계약(단일 게이트웨이·토큰 저장·STOMP prefix·커서 페이지네이션·검증 에러), REST 엔드포인트 카탈로그, 그리고 React↔백엔드 정정 8건(STOMP 발행 `/msg/chat.send`, 방 구독 `/topic/chat/{roomId}`, 배지 `/user/queue/chat/badge`, 재발급 `/auth/refresh`+`Authorization` 헤더, 방 나가기 `DELETE .../members`, 방 수정 `PATCH`, 핸드셰이크 `?access_token=` 등)은 **모두 백엔드 소스로 확인·정정 완료**되어 `docs/API_CONTRACT.md`(§0~§3)로 옮겼다. 근거 파일 경로도 그 문서에 인라인돼 있다.

- **정정 8건은 이미 코드 반영 완료([x])** — 값 자체는 `docs/API_CONTRACT.md` 카탈로그/STOMP 표를 참조.
- 이 파일 §2~4의 태스크는 그 계약을 전제로 한 **이식 절차·레거시 코드**만 남긴다.

---

## 2. 인증 흐름 이식

- [x] **2.1 401 single-flight refresh + 재시도 + 로그인 리다이렉트** — `src/apis/apiClient.ts`
  - **완료**: single-flight(`refreshAccessTokenOnce`)·원요청 재시도(`_retry`)·실패 시 `removeAccessToken` + `saveRedirectAfterLogin`(현재 경로 저장). refresh 요청은 인터셉터 없는 별도 `authClient`로 분리해 무한루프 차단.
  - **완료(페이지 연결)**: `/login` 라우트가 없고 로그인이 **모달**이라, 재발급 실패 시 `handleRefreshFailure`가 `AUTH_SESSION_EXPIRED_EVENT`를 발행 → `App`이 `setUser(null)` + 로그인 모달 오픈으로 연결(§2.4).
  - 401 → refresh 1회(single-flight, `_retry`) → 원요청 재시도. refresh 경로 자체 401/재시도 초과 → 토큰 제거 + 돌아올 URL 저장 + 로그인 페이지.
  - refresh 경로/응답 계약은 API_CONTRACT §2(정정 완료). 남은 건 single-flight·redirect 처리.
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

- [x] **2.2 로그인 성공 토큰 수신** — `src/pages/LoginSuccessPage/LoginSuccessPage.tsx` (디렉토리 단위로 이동됨)
  - **완료**: `?accessToken=` 파싱 → `setAccessToken` → `consumeRedirectAfterLogin()`로 원래 경로 복귀(없으면 `/`).
  - 참고(레거시 대비 축약): 토큰 누락 시 `getAccessToken()` 폴백·`history.replaceState`로 URL 토큰 제거는 생략(현재 불필요 판단). 필요 시 아래 레거시 참고.
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

- [x] **2.3 로그인 시작 / 로그아웃** — `src/apis/authApi.ts`
  - **완료**: 시작 `getOAuthLoginUrl(provider)`는 `LoginModal`의 소셜 버튼 `href`로 연결, 로그아웃 `logout()`(`POST /auth/logout`)는 `App.handleLogout`에서 호출 → `removeAccessToken`·`setUser(null)`·`setNotifications([])`·`navigate('/')`.
  - 경로 계약(`/oauth2/authorization/{google|kakao}`, `POST /auth/logout`)은 API_CONTRACT §2 인증.

- [x] **2.4 앱 초기 사용자 로딩** — `src/App.tsx`
  - **완료**: 초기 `user`를 `null`로, `isInitializingUser`는 토큰 유무로 lazy init(`useState(() => getAccessToken() !== null)`). 마운트 `useEffect`에서 토큰 있으면 `getMyProfile()`(`GET /user/me`)로 복원(`isCancelled` 취소 가드), 실패 시 로그아웃 상태 확정. 복원 중에는 `.app-loading`으로 라우트 렌더를 게이트해 "로그인됨↔안됨" 깜빡임 방지.
  - **2.1 남음 연결(세션 만료)**: `apiClient`가 재발급 실패 시 `AUTH_SESSION_EXPIRED_EVENT`(window 이벤트) 발행 → `App`이 수신해 `setUser(null)` + 알림 초기화 + 로그인 모달 오픈. `apiClient`(비-React)를 React 상태에 연결하는 다리.

---

## 3. STOMP 연결 이식

- [x] **3.1 핸드셰이크 토큰 = URL 쿼리 + 재연결 재구독** — `src/apis/stompClient.ts`
  - **완료**: 토큰을 `connectHeaders`→**SockJS URL 쿼리 `?access_token=`**로 변경(`webSocketFactory` 내부에서 매 연결 최신 토큰), `reconnectDelay: 5000`.
  - **재구독 방식 확정**: 레거시식 싱글턴+topic맵을 도입하지 않고, **각 페이지 `useEffect`가 `createStompClient()`→`activate()` / cleanup `deactivate()`** 패턴으로 구독을 소유(`ChatRoomPage`·`MyChatRoomPage` 적용). `client.onConnect`에서 구독을 건다.
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

- [x] **4.1 낙관적 전송(optimistic send)** — `ChatRoomPage.handleSubmit`
  - **완료**: `createClientMessageId()` → `createPendingChatMessage(...)`로 `pending` 말풍선 즉시 append → `sendChatMessage(client, request)` 발행. 발행 실패(throw) 시 해당 메시지 즉시 `failed`.
  - 레거시와 차이: pending은 별도 `Map`이 아니라 **메시지 리스트의 `status`(`pending`/`sent`/`failed`)**로 관리, 내가 보낸 것 스킵은 `mySent` 대신 브로드캐스트의 `clientMessageId` 매칭으로 처리(4.4).
  - 레거시:
    ```js
    const clientMessageId = uuidv4();
    // ...pending 말풍선 append...
    const timer = setTimeout(() => onTimeout(clientMessageId), 3000);
    pending.set(clientMessageId, { node, content, timer }); mySent.add(clientMessageId);
    stompClient.publish({ destination: '/msg/chat.send',
      body: JSON.stringify({ clientMessageId, roomId, writerId: myId, content }) });
    ```

- [x] **4.2 ACK 처리** — `subscribeChatMessageAck` (`chatStompApi.ts`) → `ChatRoomPage`
  - **완료**: ACK 수신 시 `clientMessageId`로 매칭. 현재 구현은 실패 ACK를 해당 말풍선 `failed`로 표시(재전송 버튼 노출). 아래 레거시는 필드별 토스트/`lastMsgSeq`까지 포함하나 현재는 축약. 구독 destination·payload 계약은 API_CONTRACT §3. 레거시 참고:
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

- [~] **4.3 타임아웃 + 재시도** — 재전송은 구현(`ChatRoomPage.handleResend`), **3초 ACK 타임아웃은 미구현**
  - **완료**: `failed` 말풍선의 재전송(↻) → **새 `clientMessageId`**로 재발행 + `pending` 복귀.
  - **남음**: ACK 무응답 시 실패 처리하는 타이머 없음(발행 자체가 throw할 때만 `failed`). 무응답 케이스는 pending으로 남는다. 필요 시 아래 레거시식 3초 타이머 추가.
    ```js
    function retry(id) { const e = pending.get(id); if (!e) return;
      clearTimeout(e.timer); e.timer = setTimeout(() => onTimeout(id), 3000);
      stompClient.publish({ destination: '/msg/chat.send',
        body: JSON.stringify({ clientMessageId: id, roomId, writerId: myId, content: e.content }) }); }
    ```

- [x] **4.4 브로드캐스트 수신 + 중복 제거** — `subscribeChatRoomMessages` → `ChatRoomPage`
  - **완료**: `/topic/chat/{roomId}` 구독. 내가 보낸 것은 리스트에서 같은 `clientMessageId`의 `pending`을 찾아 **실제 메시지로 치환**(중복 append 방지), 없으면 새로 append. 하단 근처(≤40px)면 오토스크롤. 수신 타입/매퍼는 flat로 정정 완료(`types/chatMessage.ts`·`chatMessageUtils.ts`). 계약은 API_CONTRACT §3.
    ```js
    function onBroadcast(message) {   // message: flat payload(messageId/timestamp)
      if (mySent.has(message.clientMessageId)) { mySent.delete(message.clientMessageId); return; }
      const distFromBottom = chatBox.scrollHeight - (chatBox.scrollTop + chatBox.clientHeight);
      appendMessage(message); lastMsgSeq++;
      if (distFromBottom <= 40) chatBox.scrollTop = chatBox.scrollHeight;   // 하단 근처면 오토스크롤
    }
    ```

- [~] **4.5 초기 로딩 순서** — 메시지 조회+하단 스크롤은 구현, **방 상세 조회는 미구현**
  - **완료**: 마운트 시 `getChatMessages()`(최신, limit 10) → reverse → 렌더 후 최하단 스크롤. `user`는 props로 받으므로 별도 `loadMyProfile()` 불필요.
  - **남음**: `GET /chat/room/{roomId}`로 방 상세(제목 등) 조회를 하지 않아 **`roomTitle`이 하드코딩**(`"비트코인 단기 시황방"`, MOCK_DATA #4). `lastMsgSeq` 기반 로직도 현재 미사용.

- [x] **4.6 이전 메시지 커서 로딩 + 스크롤 보정** — `ChatRoomPage.loadPreviousMessages`
  - **완료**: 상단 근접(임계 40px) 스크롤 시 가장 오래된 메시지 커서로 이전 페이지 조회 → prepend → `scrollHeight` 차이로 스크롤 위치 보정. 계약은 API_CONTRACT §2 채팅 메시지.
    ```js
    const prevScrollHeight = chatBox.scrollHeight, prevScrollTop = chatBox.scrollTop;
    items.forEach(prependMessage);
    chatBox.scrollTop = chatBox.scrollHeight - prevScrollHeight + prevScrollTop;
    ```

- [ ] **4.7 활동/읽음 보고** — `beforeunload`에서 활동 보고(엔드포인트·params 계약은 API_CONTRACT §2 채팅방). 언로드 유실 방지 위해 `fetch(keepalive:true)` + `Authorization` 헤더 수동.
    ```js
    fetch(`${GATEWAY_URL}/chat/room/${roomId}/activity?lastMsgSeq=${lastMsgSeq}&lastMsgMs=${lastTs ?? 0}`,
      { method: 'PUT', headers: { authorization: `Bearer ${getAccessToken()}` }, keepalive: true }).catch(()=>{});
    ```

- [~] **4.8 타 유저 프로필 캐시** — 아바타 닉네임용 `GET /user/{userId}/profile`을 캐시 + in-flight dedup.
  - **배관 완료**: `userApi.ts`에 `getUserProfile(userId)` 추가(모듈 캐시 `Map` + in-flight dedup). 응답 계약(`/user/{userId}/profile` = `UserResponse` → `mapUserResponseToUser`)은 API_CONTRACT §2 사용자.
  - **보류(페이지)**: `ChatRoomPage`에서 `createAvatarEl` 대체로 호출 연결은 §4 채팅 연동 시.
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

- [~] **4.9 내 채팅방 목록 배지** — 구독+갱신은 구현, **재정렬/미존재 방 처리는 미구현**
  - **완료**: `MyChatRoomPage`에서 `subscribeMyChatRoomBadge` 구독(`/user/queue/chat/badge`). 이벤트의 `memberIds`로 내 방인지 확인 후 해당 방의 `unreadMsgCnt+1`·`lastMsgContent`·`lastMsgCreatedAt` 갱신. 계약은 API_CONTRACT §3.
  - **남음**: 갱신된 방을 목록 **맨 앞으로 이동**하지 않고 제자리 갱신만 함(`.map`). 목록에 없는 방일 때 **단건 조회 후 prepend**도 미구현.

---

## 5. 참고 (현재 React 파일 배치 · 관련 문서)

- 통신: `src/apis/{apiClient,authApi,stompClient,chatStompApi,chatRoomApi,chatMessageApi,userApi}.ts`, `src/constants/api.ts`.
- 유틸: `src/utils/{authStorage,chatMessageUtils,dateFormatter,userMapper,...}.ts`. 토큰 저장은 `authStorage.ts`.
- 화면: `src/pages/*`(ChatRoomPage·MyChatRoomPage·LoginSuccessPage·CreateChatRoomPage·UpdateChatRoomPage 등).
- 문서: 구조 `docs/ARCHITECTURE.md`, 화면 `docs/PAGES.md`, 계약 `docs/API_CONTRACT.md`, 인증 `docs/AUTH.md`, 목 교체 대상 `docs/MOCK_DATA.md`, 규칙 `.claude/rules/backend-integration.md`.
- 검증: 각 단계 후 `npm run build`(타입체크) + `npm run lint`. 가능하면 게이트웨이 띄우고 `npm run dev`로 플로우 확인.
- 백엔드 계약 원천(다른 저장소 `../crypto-project-backend`): STOMP `common-core/.../StompDestination.java`·`websocket-gateway/.../StompConfig.java`, 재발급 `oauth2-client/.../AuthController.java`, 채팅 REST `chat/.../ChatRoomController.java`, 라우팅 `git-config-repo/dynamic/api-gateway.yml`.
