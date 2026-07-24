# API CONTRACT

프론트엔드가 기대하는 백엔드 계약. 모든 경로는 `GATEWAY_URL` 기준(API Gateway). 실제 구현은 `../crypto-project-backend`의 각 서비스 컨트롤러에 있으며, **연동 시 이 문서와 백엔드를 반드시 대조**한다(추측 금지).

> 이 문서의 REST/STOMP 값은 **백엔드 소스로 확인·정정 완료**된 계약이다(근거 파일은 각 항목 하단 "백엔드 근거"). 실연동 태스크·레거시 이식 코드는 `TODO.md`에 있다.

표기: `프론트 함수` → `METHOD 경로` (정의 파일)

## 0. 공통 계약 (전제)

- **단일 게이트웨이**: 모든 REST/WS는 `GATEWAY_URL`(`src/constants/api.ts` = `VITE_GATEWAY_URL`)로 나간다.
- **HTTP**: `apiClient`(`src/apis/apiClient.ts`, `withCredentials: true`). refresh 토큰은 httpOnly 쿠키(백엔드 Set-Cookie), access 토큰은 `sessionStorage`(`src/utils/authStorage.ts`). 요청 헤더 `Authorization: Bearer {accessToken}`(있을 때).
- **STOMP prefix**: 앱(전송) `/msg`, user `/user`, 브로커(구독) `/topic`·`/queue`. 엔드포인트 `/ws`(SockJS)·`/ws-native`(native) 둘 다 등록. **핸드셰이크 인증 = URL 쿼리 `?access_token=`**(connectHeaders 아님, 없으면 401).
- **커서 페이지네이션**: 응답 `{ items, hasNext }`. 다음 페이지는 마지막 항목 커서로 요청.
- **검증 에러**: 실패 응답 `response.data.errors = [{ field, message, code? }]`.
- 백엔드 근거: STOMP prefix `websocket-gateway/.../StompConfig.java`(`setApplicationDestinationPrefixes`) + `git-config-repo/dynamic/websocket-gateway.yml`(`application-destination-prefix: /msg`), 핸드셰이크 `gateway WebsocketHandshakeAuthWebFilter`.

## 1. REST 엔드포인트 카탈로그

모두 `GATEWAY_URL` prefix, `apiClient` 경유.

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

## 2. REST 상세

### 인증 (`apis/authApi.ts`, `apiClient.ts`)
> 프론트 구현 상세(흐름·인터셉터·토큰 저장)는 `docs/AUTH.md`. 401 재발급·로그인 이식 태스크는 `TODO.md` §2.

| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getOAuthLoginUrl(provider)` | 브라우저 이동 `GET /oauth2/authorization/{google\|kakao}` | 성공 시 SPA로 `?accessToken=...`(URL 쿼리)로 access 토큰 전달 |
| `logout()` | `POST /auth/logout` (Bearer) | 2xx |
| (인터셉터) 토큰 재발급 | `POST /auth/refresh` (빈 body, `withCredentials`) | **status 201**, access 토큰은 응답 **`Authorization` 헤더**(`Bearer {token}`). body 아님. |

- 재발급 응답 파싱: `const h = res.headers['authorization']; const token = h?.startsWith('Bearer ') ? h.slice(7) : null;`
- `withCredentials: true` — refresh 토큰 쿠키 전제. 재발급 응답은 `Set-Cookie`(refresh 회전) + `Access-Control-Expose-Headers: Authorization`.
- 백엔드 근거: `oauth2-client/.../web/AuthController.java` — `@PostMapping("${api-path.auth.refresh:/auth/refresh}")`, `ResponseEntity.status(CREATED).header(AUTHORIZATION, "Bearer "+token).header(SET_COOKIE, ...)`.

### 사용자 (`apis/userApi.ts`)
| 프론트 | 요청 | 응답 타입 |
| --- | --- | --- |
| `getMyProfile()` | `GET /user/me` | `UserResponse { id, nickname, email, createdAt }` |
| `updateMyProfile({nickname})` | `PATCH /user/me` `{ nickname }` | - |
| `getUserProfile(userId)` | `GET /user/{userId}/profile` | `UserResponse` (`/user/me`와 동일 형태 → `mapUserResponseToUser`) |

### 채팅방 (`apis/chatRoomApi.ts`)
| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getPopularChatRooms` | `GET /chat/rooms/popular?limit&category&lastId&lastPopularity` | `PopularChatRoomResponse { items: PopularChatRoom[], hasNext }` |
| `getMyChatRooms` | `GET /chat/rooms/me?limit&lastUnreadFlag&lastMsgCreatedAt&lastId` | `MyChatRoomResponse { items: MyChatRoom[], hasNext }` |
| `getMyChatRoom(roomId)` | `GET /chat/room/{roomId}/me` | 내 채팅방 단건(목록에 없을 때 prepend용) |
| `getChatRoom(roomId)` | `GET /chat/room/{roomId}` | 방 상세(`msgCnt` → `lastMsgSeq` 초기값) |
| `createChatRoom` | `POST /chat/room` `{ title, description, category }` | 201 |
| `updateChatRoom` | `PATCH /chat/room/{roomId}` 변경 필드만 `{ title?, description?, category? }` | 204 |
| `joinChatRoom(roomId)` | `POST /chat/room/{roomId}/members` | 201·204 |
| `leaveChatRoom(roomId)` | `DELETE /chat/room/{roomId}/members` | 204 |
| `reportActivity` | `PUT /chat/room/{roomId}/activity?lastMsgSeq&lastMsgMs` | - |

- `category`는 현재 `CRYPTO_CURRENCY` 단일값(`types/chatRoom.ts`의 `CHAT_ROOM_CATEGORIES`).
- 활동 보고는 `beforeunload`에서 유실 방지를 위해 `fetch(keepalive:true)` + 수동 `Authorization` 헤더로 보낸다(구현 상세는 `TODO.md` §4.7).
- 백엔드 근거: `chat/.../web/ChatRoomController.java` — `@PatchMapping("${api-path.chat.room:/room/{roomId}}")`, `@DeleteMapping("${api-path.chat.room-members:/room/{roomId}/members}")`.

### 채팅 메시지 (`apis/chatMessageApi.ts`)
| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getChatMessages` | `GET /chat/room/{roomId}/messages?limit&lastId&lastCreatedAtMillis` | `ChatMessagesResponse { items: ChatMessageResponseItem[], hasNext }` |

`items`는 **최신순(newest-first)**으로 온다(백엔드 확인). 프론트는 `reverse()` 후 오래된→최신 순으로 렌더한다(`ChatRoomPage`). 이전 메시지 커서 로딩은 첫 항목 커서로 요청. 백엔드 근거: `chat-adapter-out/.../persistence/MongoChatMessageAdapter.listLatestMessages`(첫 페이지, `Sort DESC createdAt, DESC _id`) + `MongoChatMessageRepositoryImpl.listMessagesBefore`(커서, `desc(createdAt), desc(_id)`).

### 가격 알림 (아직 api 모듈 없음 — 연동 시 신규 생성 필요)
타입은 `types/priceAlert.ts`에 정의됨. 기대 계약:
| 동작 | 요청 | 응답 |
| --- | --- | --- |
| 내 설정 조회 | `GET /price-alerts/me` | `GetMyPriceAlertSettingsResponse { settings: PriceAlertSetting[] }` |
| 내 설정 저장 | `PUT /price-alerts/me` `UpdateMyPriceAlertSettingsRequest { creates[], updates[], deletes[] }` | - |
| 마켓 목록 조회 | 확인 필요(현재 프론트 하드코딩) | `PriceAlertMarket[]` 형태 |

- `targetChangeRate`는 **비율**(0.03 = 3%). 화면 퍼센트("3")↔비율 변환은 `priceAlertMapper.ts`.
- 백엔드 컨트롤러: `market/market-adapter-in/.../PriceAlertSettingController.java` (경로/DTO 실제 확인 필요).

## 3. STOMP (`apis/chatStompApi.ts`, `stompClient.ts`)

연결: `GATEWAY_URL/ws`(SockJS) 또는 `GATEWAY_URL/ws-native`(native). **핸드셰이크 인증 = URL 쿼리 `?access_token=`**(connectHeaders 아님). 예: `new SockJS(GATEWAY_URL + '/ws?access_token=' + getAccessToken())`.

| 방향 | destination | 페이로드 |
| --- | --- | --- |
| 발행 | `/msg/chat.send` | `ChatMessageRequest { clientMessageId, roomId, writerId, content }` |
| 구독 | `/topic/chat/{roomId}` | **flat** `{ messageId, roomId, writerId, content, timestamp, clientMessageId }` (본인 발행분은 `clientMessageId`가 `mySent`에 있으면 스킵) |
| 구독 | `/user/queue/chat/ack` | `ChatMessageAck { id, clientMessageId, success, ts, errors }` |
| 구독 | `/user/queue/chat/badge` | 배지 이벤트 `{ id, lastMsgContent, lastMsgCreatedAt }` |

- **방 브로드캐스트 payload(백엔드 소스로 확정)**: `/topic/chat/{roomId}`로 실제 전송되는 wire 형태는 **flat record**다:
  ```
  { messageId: string, roomId: string, writerId: string, content: string,
    timestamp: number(epoch millis, long), clientMessageId: string }
  ```
  - 필드는 `messageId`(nested `payload.id` 아님), 시간은 `timestamp`(epoch millis 숫자, ISO 문자열 아님)다.
  - 프론트가 기대하던 `ChatMessageBroadcastEvent { payload, memberIds, clientMessageId }`는 **내부 Kafka 이벤트**(`chat-contract/ChatMessageBroadcastEvent`)이지 브라우저가 받는 형태가 아니다. websocket-gateway가 Kafka 이벤트를 소비→command 매핑 후 **위 flat payload**만 STOMP로 보낸다. `memberIds`는 서버 로컬 전달 판단용이라 wire에는 없다. → 프론트 타입/매퍼를 flat 형태로 맞춰야 한다.
- **ACK payload**: `success: true`면 `id`(서버 메시지 id)·`ts`(타임스탬프) 확정, `false`면 `errors.errors = [{ code, field, message }]`(검증 실패) 또는 그 외(재시도 유도).
- `writerId`/`roomId`는 발행 시 문자열로 보냄. 브로드캐스트 수신 payload도 문자열이며 프론트에서 `Number(...)` 변환(`chatMessageUtils`).
- 백엔드 근거: wire payload `websocket-gateway-adapter-out/.../stomp/payload/StompChatMessagePayload.java`(record) + `StompChatMessageBroadcastAdapter.java`(`convertAndSend(CHAT_ROOM_PREFIX.destination(roomId), payload)`). 매핑 `ChatMessageBroadcastEventMapper.java`(내부 `ChatMessagePayload.createdAt: Instant` → `timestamp: long(epochMilli)`, null이면 `0`).
- 실시간 프로토콜(낙관적 전송·ACK 재조정·재시도·중복제거·재구독) 이식 절차와 레거시 코드는 `TODO.md` §3~4.
- 백엔드 근거: `common/common-core/.../StompDestination.java` — `CHAT_ROOM_PREFIX("/topic/chat/")`, `CHAT_ACK_QUEUE("/queue/chat/ack")`, `CHAT_ROOM_BADGE_QUEUE("/queue/chat/badge")`(user prefix `/user`); `StompController.java` — `@MessageMapping("/chat.send")`.

## 4. 실시간 알림 스트림 (채널 확인 완료 · 프론트 미연결)

- **채널: STOMP**(SSE 아님). 백엔드가 사용자별로 `convertAndSendToUser(receiverId, "/topic/notification/", payload)`로 보낸다 → 클라이언트 **구독 destination = `/user/topic/notification/`**(user-destination). 로컬 세션이 있는 대상에게만 push.
- **wire payload** `StompWebNotificationPayload`:
  ```
  { type: string, title: string, body: string,
    createdAtMs: number(epoch millis, long), link: string, data: Record<string, unknown> }
  ```
- **프론트 현황/할 일**: `types/notification.ts`의 `UpbitTickerAlertEvent`를 받아 `Notification`으로 매핑하는 `notificationMapper`는 있으나 **App에 실시간 구독이 연결돼 있지 않다**(현재 `HomePage` 테스트 버튼 `handleMockAlert`로만 생성). 연동 시 (1) `App`에서 `/user/topic/notification/` 구독을 연결하고, (2) 프론트 타입/매퍼를 위 `StompWebNotificationPayload`(generic 알림: `type/title/body/link/data`) 형태에 맞춰야 한다 — 현재 `UpbitTickerAlertEvent` 가정과 **형태가 다르다**.
- 백엔드 근거: `websocket-gateway-adapter-out/.../notification/adapter/out/stomp/StompWebNotificationAdapter.java`(`convertAndSendToUser`, `NOTIFICATION_PREFIX = "/topic/notification/"`) + `.../stomp/payload/StompWebNotificationPayload.java`. 흐름: `notification`이 Kafka `web-notification-broadcast-event` 발행 → websocket-gateway 소비(`WebNotificationEventMapper` → command) → 위 STOMP 전송.
