# PAGES & FEATURES — 카테고리별 역할·기능·플로우

화면과 기능을 도메인 카테고리로 묶어 정리한다. 라우트 정의는 `src/App.tsx`, 전체 구조는 `docs/ARCHITECTURE.md`.

공통 사항:
- 로그인 사용자(`user`)는 `App.tsx`가 보유하고 각 페이지에 **props로 전달**한다. 라우트 가드 컴포넌트는 없고, 각 페이지가 `user === null`이면 안내 카드를 직접 렌더한다.
- 목록은 전부 **커서 페이지네이션**(더 보기 버튼). 실시간은 STOMP.
- ⚠️ 표시는 목/스텁 동작 → 상세·교체 방법은 `docs/MOCK_DATA.md`.

## 카테고리 목차
| 카테고리 | 라우트/기능 |
| --- | --- |
| [홈](#1-홈-home) | `/` |
| [채팅](#2-채팅-chat) | `/chat`, `/chat/my`, `/chat/create`, `/chat/update`, `/chat/room` |
| [가격 알림](#3-가격-알림-price-alerts) | `/price-alerts` |
| [알림](#4-알림-notification) | (페이지 아님) Header 드롭다운 + App 상태 |
| [계정](#5-계정-account) | `/account`, `/account/profile-edit` |
| [인증](#6-인증-auth) | `/login-success`, LoginModal |
| [전역 공용 컴포넌트](#7-전역-공용-컴포넌트) | Header, Footer, LoadingButton, SideNavigation |

---

## 1. 홈 (Home)

### `/` — HomePage (`pages/HomePage/HomePage.tsx`)
- **역할**: 랜딩(메인).
- **기능**: 현재는 플레이스홀더. `<h1>메인 페이지</h1>` + "테스트 알림 발생" 버튼뿐.
- **플로우**: 버튼 클릭 → `onMockAlert`(App의 `handleMockAlert`) → 가짜 `UpbitTickerAlertEvent` 생성 → [알림](#4-알림-notification) 드롭다운에 누적.
- ⚠️ 실제 홈 콘텐츠·실시간 알림 미구현(`MOCK_DATA.md` 5·6번).
- **로그인 필요**: X.

---

## 2. 채팅 (Chat)

가상화폐 오픈채팅. 목록·CRUD·실시간 메시지로 구성. 관련 API는 `apis/chatRoomApi.ts`, `apis/chatMessageApi.ts`, `apis/chatStompApi.ts`.

### `/chat` — ChatPage (인기 채팅방) (`pages/ChatPage/ChatPage.tsx`)
- **역할**: 누구나 볼 수 있는 인기 오픈채팅방 목록.
- **기능**:
  - 마운트 시 인기 채팅방 조회(카테고리 고정 `CRYPTO_CURRENCY`, limit 10).
  - "더 보기"로 다음 페이지(커서: 마지막 방의 `lastId` + `lastPopularity`).
  - 방 카드: 제목/인기도/설명/멤버수/방장/생성일. "입장하기" 버튼.
  - 로그인 시 상단에 "내 채팅방"·"채팅방 생성" 링크 노출.
- **플로우**:
  ```
  마운트 → getPopularChatRooms() → 목록 렌더
  더 보기 → getPopularChatRooms(cursor) → 목록 append
  입장하기 → 로그인 확인
     · 미로그인: alert("로그인이 필요한 서비스입니다.")
     · 로그인: navigate(/chat/room?roomId={id})
  ```
- **API**: `getPopularChatRooms`.
- **로그인 필요**: 목록 조회 X, **입장은 O**.

### `/chat/my` — MyChatRoomPage (내 채팅방) (`pages/MyChatRoomPage/MyChatRoomPage.tsx`)
- **역할**: 내가 참여 중인 채팅방 목록 + 실시간 뱃지.
- **기능**:
  - 내 채팅방 조회(limit 10, 커서: `lastUnreadFlag`+`lastMsgCreatedAt`+`lastId`).
  - 각 방: 안읽음 수 뱃지(99+ 처리), 최근 메시지/시각, 멤버수, 방장(👑) 표시.
  - 액션: 입장 / (방장이면)수정 / 나가기.
  - **실시간 뱃지**: STOMP 구독으로 새 메시지 도착 시 안읽음 수·최근 메시지 갱신.
- **플로우**:
  ```
  미로그인 → 안내 카드
  로그인:
    마운트 → getMyChatRooms() → 목록
    STOMP connect → subscribeMyChatRoomBadge()
       이벤트 수신 → (내가 멤버인 방인지 확인) → unreadMsgCnt+1, 최근 메시지 갱신
    입장 → /chat/room?roomId={id}
    수정(방장) → /chat/update?roomId&title&description&category  (쿼리스트링으로 기존 값 전달)
    나가기 → confirm → leaveChatRoom(id) → 목록에서 제거
  ```
- **API/STOMP**: `getMyChatRooms`, `leaveChatRoom`, `subscribeMyChatRoomBadge`.
- ⚠️ 조회 **실패 시 목 데이터로 폴백**(`mockMyChatRooms`) — `MOCK_DATA.md` 3번.
- **로그인 필요**: O.

### `/chat/create` — CreateChatRoomPage (`pages/CreateChatRoomPage/CreateChatRoomPage.tsx`)
- **역할**: 새 채팅방 생성 폼.
- **기능**: 제목(최대 50자)·카테고리(가상화폐 고정)·설명(최대 300자). 제목/설명 공백 검증.
- **플로우**:
  ```
  미로그인 → 안내 카드
  제출 → trim 검증(빈 값이면 alert) → createChatRoom() → 성공 alert → navigate(/chat/my)
       실패 → alert
  ```
- **API**: `createChatRoom`.
- **로그인 필요**: O.

### `/chat/update` — UpdateChatRoomPage (`pages/UpdateChatRoomPage/UpdateChatRoomPage.tsx`)
- **역할**: 기존 채팅방 정보 수정(방장용).
- **기능**: `MyChatRoomPage`에서 **쿼리스트링으로 넘어온** `roomId`·`title`·`description`·`category`를 초기값으로 폼 구성. 카테고리 유효성은 `isChatRoomCategory` 가드로 검증.
- **플로우**:
  ```
  미로그인 → 안내 카드
  roomId 없음/NaN → "수정할 채팅방 정보가 없습니다" 안내
  제출 → roomId 유효성 + trim 검증 → updateChatRoom(roomId, ...) → 성공 alert → navigate(/chat/my)
  ```
- **API**: `updateChatRoom`.
- **로그인 필요**: O. (권한은 서버가 검증; 화면은 방장 접근 전제)

### `/chat/room?roomId=` — ChatRoomPage (실시간 채팅방) (`pages/ChatRoomPage/ChatRoomPage.tsx`)
- **역할**: 실제 채팅이 오가는 방. 채팅 카테고리의 핵심 화면.
- **기능**:
  - 최근 메시지 조회(limit 10) → 하단 스크롤.
  - **위로 스크롤하면 이전 메시지 로드**(무한 스크롤, 스크롤 위치 보정).
  - STOMP로 메시지 실시간 송수신.
  - **낙관적 전송**: 보내는 즉시 `pending` 말풍선 → 브로드캐스트 수신 시 실제 메시지로 치환(`clientMessageId` 매칭) → ACK 실패/발행 실패 시 `failed` + 재전송(↻) 버튼.
  - 연결 상태 점(연결/끊김), 전송 중이면 입력·전송 잠금.
- **메시지 상태**: `pending`(전송 중) → `sent`(수신 완료) / `failed`(실패, 재전송 가능).
- **플로우**:
  ```
  미로그인 → 안내 카드
  roomId 무효 → 안내 + /chat 링크
  로그인 & 유효:
    (1) getChatMessages() → reverse → 렌더 → 하단 스크롤
    (2) STOMP connect:
          subscribeChatRoomMessages()  (수신 → 목록 반영, 하단 근처면 자동 스크롤)
          subscribeChatMessageAck()    (success=false → 해당 메시지 failed)
    전송: 입력 → pending 추가 → sendChatMessage()
          발행 실패 시 즉시 failed
    상단 스크롤(임계 40px) → loadPreviousMessages(커서: 가장 오래된 메시지) → 앞에 prepend + 스크롤 보정
  ```
- **API/STOMP**: `getChatMessages`, `subscribeChatRoomMessages`, `subscribeChatMessageAck`, `sendChatMessage`.
- ⚠️ 방 제목 하드코딩(`roomTitle = "비트코인 단기 시황방"`) — `MOCK_DATA.md` 4번.
- **로그인 필요**: O.

---

## 3. 가격 알림 (Price Alerts)

### `/price-alerts` — PriceAlertsPage (`pages/PriceAlertsPage/PriceAlertsPage.tsx`)
- **역할**: 코인별 가격 변화율 알림 **설정**(수신은 아래 [알림](#4-알림-notification) 카테고리).
- **기능**:
  - 마켓 추가 모달(멀티 선택) → 폼에 카드 추가.
  - 카드별: 알림 on/off, 변화율 기준 선택(3%/5%/7%), 삭제 표시.
  - "처음상태"(미저장 변경 되돌리기), "내 알람 설정하기"(저장).
  - 저장 요청은 현재 폼과 저장본을 비교해 **creates/updates/deletes로 diff**(`priceAlertMapper.convertFormToRequest`).
- **데이터 규칙**: 화면은 퍼센트("3"), 서버는 비율(0.03). 변환은 `priceAlertMapper`.
- **플로우**:
  ```
  미로그인 → 안내 카드
  알림 추가 → 모달에서 코인 선택 → 폼에 카드 추가
  카드 편집(on/off, 변화율, 삭제 표시) → hasUnsavedChanges 계산
  저장 → diff 계산 → (변경 없으면 alert) → 저장 → 폼/저장본 동기화
  ```
- ⚠️ **전체가 목**: 마켓 목록 하드코딩, 저장 설정 `mockSavedSettings`, 저장이 `console.log` 스텁(실제 PUT 미호출), **api 모듈 없음** — `MOCK_DATA.md` 2번(범위 가장 큼).
- **로그인 필요**: O.

> **연관**: 여기서 설정한 기준을 넘으면 백엔드가 `UpbitTickerAlertEvent`를 보내고, 그것이 [알림](#4-알림-notification)으로 표시되는 것이 최종 설계다(수신 연동은 아직 없음).

---

## 4. 알림 (Notification)

**페이지가 아니라 앱 전역 기능**이다. 별도 라우트 없이 `App.tsx`(상태) + `Header`(표시)로 동작한다. 관련: `types/notification.ts`, `utils/notificationMapper.ts`.

- **역할**: 가격 변동 등 서버 이벤트를 헤더 벨(🔔) 드롭다운으로 보여준다.
- **상태 소유**: `App.tsx`의 `notifications: Notification[]`.
  - `handleReceiveUpbitTickerAlert(event)` — 이벤트를 `Notification`으로 매핑해 목록 **맨 앞에 추가**.
  - `handleReadNotification(id)` — 해당 알림 `read: true`로 변경.
  - 로그아웃 시 `setNotifications([])`로 초기화.
- **매핑**(`notificationMapper.mapUpbitTickerAlertToNotification`): `UpbitTickerAlertEvent`(code, price, changeRate 등) → `Notification`.
  - 제목/본문 생성, 변화율은 `%`로, 가격은 천단위 콤마.
  - `messageParts`로 부분 굵게(`bold`)·줄바꿈(`lineBreakAfter`) 렌더 지원.
- **표시**(`Header`): 안읽음이 하나라도 있으면 벨에 빨간 점(`hasUnreadNotification`). 드롭다운에서 항목 클릭 시:
  ```
  onReadNotification(id) → read 처리
  notification.link 있으면 → 드롭다운 닫고 navigate(link)
  ```
  바깥 클릭 시 드롭다운 닫힘.
- **타입**(`types/notification.ts`): `Notification`(id, title, message, messageParts?, link?, createdAt, read), `NotificationMessagePart`, `UpbitTickerAlertEvent`.
- **플로우(현재)**:
  ```
  HomePage "테스트 알림 발생" → handleMockAlert → 가짜 UpbitTickerAlertEvent
    → handleReceiveUpbitTickerAlert → 매핑 → notifications 맨 앞 추가
    → Header 벨 점 표시 → 드롭다운에서 확인/읽음
  ```
- **플로우(목표)**:
  ```
  백엔드 알림 채널(STOMP 등) 구독 → 실제 UpbitTickerAlertEvent 수신
    → handleReceiveUpbitTickerAlert (동일 경로)
  ```
- ⚠️ **미구현/한계** (`MOCK_DATA.md` 5번):
  - 실시간 수신 **구독이 App에 연결돼 있지 않다**. 지금은 오직 테스트 버튼으로만 알림이 생긴다.
  - 읽음 상태는 **클라이언트 전용**(서버에 read 저장 요청 없음).
  - 알림은 메모리에만 있어 **새로고침/로그아웃 시 사라진다**(영속화 없음).
- **연동 시 할 일**: `notification` 서비스의 전송 채널(STOMP destination or SSE 등) 확인 → App에서 구독해 `handleReceiveUpbitTickerAlert`로 연결. 매핑 로직은 완성돼 있어 재사용. 필요하면 읽음 처리/미조회 목록 조회 API 추가 검토.

---

## 5. 계정 (Account)

### `/account` — AccountPage (`pages/AccountPage/AccountPage.tsx`)
- **역할**: 계정 설정의 레이아웃 셸. 좌측 `SideNavigation` + 우측 `<Outlet />`.
- **기능**: `/account` 진입 시 `index` 라우트가 `/account/profile-edit`로 리다이렉트.
- **로그인 필요**: O(미로그인 시 안내 카드).

### `/account/profile-edit` — ProfileEditPage (`pages/ProfileEditPage/ProfileEditPage.tsx`)
- **역할**: 닉네임 수정.
- **기능**: 닉네임(2~20자, 기존값과 달라야 제출 가능), 이메일은 읽기전용.
- **플로우**:
  ```
  제출(canSubmit) → updateMyProfile({nickname}) → onUserUpdated(App.setUser로 전역 반영) → 성공 alert
                    실패 → alert
  ```
- **API**: `updateMyProfile`. 저장 후 재조회 없이 로컬 `user`만 갱신(git 이력상 의도된 설계).
- **로그인 필요**: O.

---

## 6. 인증 (Auth)

상세 구현은 `docs/AUTH.md`. 여기서는 화면만 요약.

### `/login-success?accessToken=` — LoginSuccessPage (`pages/LoginSuccessPage/LoginSuccessPage.tsx`)
- **역할**: OAuth2 리다이렉트 착지점("로그인 처리 중..."만 잠깐 표시).
- **플로우**:
  ```
  쿼리 accessToken 없음 → alert + navigate(/)
  있음 → setAccessToken(sessionStorage) → consumeRedirectAfterLogin() → 원래 경로(또는 /)로 이동
  ```

### LoginModal (`components/Modal/LoginModal.tsx`)
- **역할**: 구글/카카오 소셜 로그인 진입. 각 버튼은 `getOAuthLoginUrl(provider)`를 `href`로 갖는 링크.
- Header의 "로그인" 버튼 또는 로그인 필요 액션에서 열린다.

---

## 7. 전역 공용 컴포넌트

라우트에 속하지 않지만 모든 화면에 관여한다.

- **Header** (`components/Header/Header.tsx`): 로고/채팅/가격알림 내비. 로그인 시 [알림](#4-알림-notification) 드롭다운·프로필 드롭다운(계정/로그아웃). 미로그인 상태로 "가격 알림" 클릭 시 → `saveRedirectAfterLogin('/price-alerts')` + 로그인 모달. 바깥 클릭 시 드롭다운 닫힘.
- **Footer** (`components/Footer/Footer.tsx`): 정적 링크(이용약관/개인정보/문의). 링크 대상 페이지는 아직 없음.
- **LoadingButton** (`components/Button/LoadingButton.tsx`): `isLoading` 시 스피너+문구, 자동 disabled. 제출·나가기 등 비동기 액션에 공용 사용.
- **SideNavigation** (`components/SideNavigation/SideNavigation.tsx`): 계정 등 중첩 라우트용 좌측 메뉴(재귀 트리, 접기/펼치기 지원).
