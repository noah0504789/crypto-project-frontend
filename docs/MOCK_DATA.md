# MOCK DATA — 실제 백엔드 연동 시 교체 대상

현재 UI는 완성 상태지만 일부가 목/하드코딩/스텁으로 동작한다. **실제 연동 단계에서 이 목록을 하나씩 제거·교체**한다. 각 항목: 위치 / 현재 동작 / 연동 시 해야 할 일.

우선순위 순서로 정렬(위가 먼저 처리 권장).

---

## 1. 로그인 사용자 하드코딩 — `src/App.tsx` ✅ **해결 완료**
**해결**: 초기 `user`를 `null`로 두고, 앱 시작 시 access token이 있으면 `getMyProfile()`(`apis/userApi.ts`)로 복원하도록 실연동함(TODO 2.4). 복원 중에는 `.app-loading`으로 라우트 렌더를 게이트한다. 또한 요청 중 세션 만료(재발급 실패) 시 `apiClient`가 `AUTH_SESSION_EXPIRED_EVENT`를 발행하고 `App`이 로그아웃 + 로그인 모달로 대응한다. 더 이상 "항상 로그인됨"으로 보이지 않는다.

## 2. 가격 알림 전체가 목 — `src/pages/PriceAlertsPage/PriceAlertsPage.tsx` ✅ **해결 완료**
**해결**: `src/apis/priceAlertApi.ts` 신규 생성(`getMarkets`·`getMyPriceAlertSettings`·`updateMyPriceAlertSettings`, 모두 `apiClient`). 마운트 시 `GET /markets`(활성 마켓)와 `GET /price-alerts/me`(내 설정)를 병렬 조회해 폼 구성(하드코딩 `markets`·`mockSavedSettings` 제거). 저장은 `PUT /price-alerts/me`(스텁 `console.log` 제거)로 실제 호출하고 성공(204) 후 로컬 동기화. 조회 실패 시 `loadError`로 "다시 시도" 카드 표시. 요청 바디 diff(`convertFormToRequest`)·퍼센트↔비율 변환은 기존 매퍼 재사용, 마켓 응답 변환은 `mapMarketResponseToPriceAlertMarket`(백엔드 `marketCode`→화면 `code`).

## 3. 내 채팅방 목 폴백 — `src/pages/MyChatRoomPage/MyChatRoomPage.tsx` ✅ **해결 완료**
**해결**: `mockMyChatRooms` 상수 삭제. 조회 실패(catch) 시 목 대신 빈 목록 + `loadError` 상태로 전환해 "불러오지 못했습니다 + 다시 시도" 카드를 렌더(재시도는 `reloadKey`로 재조회). 성공 시 `loadError` 해제. 실패가 더 이상 가짜 데이터로 가려지지 않는다.

## 4. 채팅방 제목 하드코딩 — `src/pages/ChatRoomPage/ChatRoomPage.tsx` ✅ **해결 완료**
**해결**: `GET /chat/room/{roomId}`(`chatRoomApi.getChatRoom`) 상세 조회로 `roomTitle`을 상태로 받아 렌더한다. 같은 조회의 `msgCnt`는 읽음 보고(활동) 시퀀스 시작점으로도 쓴다. 하드코딩 상수는 제거됨.

## 5. 알림 실시간 수신 — `src/App.tsx` ✅ **해결 완료**
**해결**: 로그인 상태일 때 `App`이 STOMP 클라이언트를 띄워 **`/user/topic/notification/`** 를 구독한다(`apis/notificationStompApi.ts`의 `subscribeWebNotifications`). 수신 wire payload는 `WebNotificationEvent`(백엔드 `StompWebNotificationPayload { type, title, body, createdAtMs, link, data }`) → `mapWebNotificationToNotification`으로 `Notification` 변환 후 목록 맨 앞에 추가 → `Header` 벨 드롭다운에 표시. 가짜 `UpbitTickerAlertEvent`·`handleMockAlert`·HomePage 테스트 버튼·구 매퍼는 제거. 로그아웃/언마운트 시 `deactivate`.
- **남은 한계**: 읽음 상태는 여전히 클라이언트 전용(서버 저장 없음), 알림은 메모리에만 있어 새로고침 시 사라짐(영속화 없음). 필요 시 읽음 처리/미조회 목록 API 추가 검토.

## 6. HomePage 콘텐츠 — `src/pages/HomePage/HomePage.tsx` (테스트 버튼 제거, 실제 콘텐츠는 제품 과제)
목/스텁(테스트 알림 버튼)은 제거되고 간단한 안내 랜딩만 남았다. 실제 랜딩/대시보드 콘텐츠는 제품 요구사항에 따라 별도 작업.

---

## 참고: 이미 실제 연동된(목 아님) 부분
아래는 이미 실 API/STOMP를 호출한다. 백엔드만 뜨면 동작 → 목으로 오해하지 말 것.
- 인기 채팅방 목록 조회 (`ChatPage` → `getPopularChatRooms`)
- 내 채팅방 조회/나가기 (`MyChatRoomPage`, 실패 시 에러 카드 — 목 폴백 제거)
- 채팅방 생성/수정 (`Create/UpdateChatRoomPage`)
- 채팅 메시지 조회 + 실시간 송수신 (`ChatRoomPage`, STOMP)
- 내 채팅방 뱃지 실시간 (`MyChatRoomPage`, STOMP)
- 프로필 수정 (`ProfileEditPage` → `updateMyProfile`)
- OAuth2 로그인/로그아웃/토큰 재발급 (`LoginModal`, `authApi`, `apiClient` 인터셉터)
- **App 로그인 사용자 실연동**(위 1번 해결) — 초기 프로필 복원 + 세션 만료 대응
- **가격 알림 조회/저장**(위 2번 해결) — `PriceAlertsPage` → `priceAlertApi`(마켓·설정·저장)
- **실시간 알림 수신**(위 5번 해결) — `App` → `subscribeWebNotifications`(`/user/topic/notification/`)

## 남은 목/미연동
- 1~5번은 모두 백엔드 연동 완료. **목(mock)/스텁 영역은 더 이상 없다.**
- 6번 HomePage는 테스트 버튼 제거 후 간단한 안내 랜딩만 있고, 실제 랜딩/대시보드 콘텐츠는 제품 요구사항에 따른 별도 작업(목 아님).
- 개선 여지(목 아님): 알림 읽음 서버 저장·영속화(5번 한계), STOMP 연결 토큰 만료 재발급(`AUTH.md`).
