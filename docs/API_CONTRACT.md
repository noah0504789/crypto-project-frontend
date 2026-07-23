# API CONTRACT

프론트엔드가 기대하는 백엔드 계약. 모든 경로는 `GATEWAY_URL` 기준(API Gateway). 실제 구현은 `../crypto-project-backend`의 각 서비스 컨트롤러에 있으며, **연동 시 이 문서와 백엔드를 반드시 대조**한다(추측 금지).

표기: `프론트 함수` → `METHOD 경로` (정의 파일)

## REST

### 인증 (`apis/authApi.ts`, `apiClient.ts`)
> 프론트 구현 상세(흐름·인터셉터·토큰 저장)는 `docs/AUTH.md`.
| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getOAuthLoginUrl(provider)` | 브라우저 이동 `GET /oauth2/authorization/{google\|kakao}` | 성공 시 `/login-success?accessToken=...` 리다이렉트 |
| `logout()` | `POST /auth/logout` | - |
| (인터셉터) 토큰 재발급 | `POST /auth/reissue` | `{ accessToken: string }` |

- 요청 헤더: `Authorization: Bearer {accessToken}` (있을 때)
- `withCredentials: true` — refresh 토큰 쿠키 전제.

### 사용자 (`apis/userApi.ts`)
| 프론트 | 요청 | 응답 타입 |
| --- | --- | --- |
| `getMyProfile()` | `GET /user/me` | `UserResponse { id, nickname, email, createdAt }` |
| `updateMyProfile({nickname})` | `PATCH /user/me` `{ nickname }` | - |

### 채팅방 (`apis/chatRoomApi.ts`)
| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getPopularChatRooms` | `GET /chat/rooms/popular?limit&category&lastId&lastPopularity` | `PopularChatRoomResponse { items: PopularChatRoom[], hasNext }` |
| `getMyChatRooms` | `GET /chat/rooms/me?limit&lastUnreadFlag&lastMsgCreatedAt&lastId` | `MyChatRoomResponse { items: MyChatRoom[], hasNext }` |
| `createChatRoom` | `POST /chat/room` `{ title, description, category }` | - |
| `updateChatRoom` | `PUT /chat/room/{roomId}` `{ title, description, category }` | - |
| `leaveChatRoom` | `DELETE /chat/room/{roomId}/members/me` | - |

`category`는 현재 `CRYPTO_CURRENCY` 단일값(`types/chatRoom.ts`의 `CHAT_ROOM_CATEGORIES`).

### 채팅 메시지 (`apis/chatMessageApi.ts`)
| 프론트 | 요청 | 응답 |
| --- | --- | --- |
| `getChatMessages` | `GET /chat/room/{roomId}/messages?limit&lastId&lastCreatedAtMillis` | `ChatMessagesResponse { items: ChatMessageResponseItem[], hasNext }` |

`items`는 최신순으로 온다고 가정하고 프론트에서 `reverse()` 후 렌더한다(`ChatRoomPage`).

### 가격 알림 (아직 api 모듈 없음 — 연동 시 신규 생성 필요)
타입은 `types/priceAlert.ts`에 정의됨. 기대 계약:
| 동작 | 요청 | 응답 |
| --- | --- | --- |
| 내 설정 조회 | `GET /price-alerts/me` | `GetMyPriceAlertSettingsResponse { settings: PriceAlertSetting[] }` |
| 내 설정 저장 | `PUT /price-alerts/me` `UpdateMyPriceAlertSettingsRequest { creates[], updates[], deletes[] }` | - |
| 마켓 목록 조회 | 확인 필요(현재 프론트 하드코딩) | `PriceAlertMarket[]` 형태 |

- `targetChangeRate`는 **비율**(0.03 = 3%). 화면 퍼센트("3")↔비율 변환은 `priceAlertMapper.ts`.
- 백엔드 컨트롤러: `market/market-adapter-in/.../PriceAlertSettingController.java` (경로/DTO 실제 확인 필요).

## STOMP (`apis/chatStompApi.ts`, `stompClient.ts`)
연결: `GATEWAY_URL/ws` (SockJS), connectHeaders `Authorization: Bearer`.

| 방향 | destination | 페이로드 타입 |
| --- | --- | --- |
| 발행 | `/app/chat.send` | `ChatMessageRequest { roomId, writerId, content, clientMessageId }` |
| 구독 | `/topic/chat/rooms/{roomId}` | `ChatMessageBroadcastEvent { payload, memberIds, clientMessageId }` |
| 구독 | `/user/queue/chat/ack` | `ChatMessageAck { clientMessageId, success, id?, ts?, code? }` |
| 구독 | `/user/queue/my-chat-room-badge` | `MyChatRoomBadgeEvent { payload }` |

- destination 상수는 백엔드 `common/common-core/.../StompDestination.java`와 대조.
- `writerId`/`roomId`는 발행 시 문자열로 보냄. 브로드캐스트 수신 payload도 문자열이며 프론트에서 `Number(...)` 변환(`chatMessageUtils`).

## 알림 스트림 (미구현)
`UpbitTickerAlertEvent`(`types/notification.ts`)를 받아 `Notification`으로 매핑하는 로직(`notificationMapper`)은 있으나, **실시간 수신 구독이 App에 연결되어 있지 않다.** 현재는 `HomePage`의 테스트 버튼(`handleMockAlert`)으로만 알림이 생성된다. 연동 방식(STOMP 구독 vs SSE 등)은 `notification` 서비스 확인 필요.

## 확인이 필요한 항목 (연동 시 백엔드와 대조)
- `/price-alerts/me` 실제 경로·DTO, 마켓 목록 API 존재 여부
- 실시간 알림 전송 채널(STOMP destination or 기타)
- `PopularChatRoom.hostId` / `writerId` 타입(문자열 vs 숫자) 백엔드 실제 값
- 채팅 메시지 조회 정렬 방향(프론트는 최신순 가정)
