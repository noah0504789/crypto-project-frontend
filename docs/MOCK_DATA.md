# MOCK DATA — 실제 백엔드 연동 시 교체 대상

현재 UI는 완성 상태지만 일부가 목/하드코딩/스텁으로 동작한다. **실제 연동 단계에서 이 목록을 하나씩 제거·교체**한다. 각 항목: 위치 / 현재 동작 / 연동 시 해야 할 일.

우선순위 순서로 정렬(위가 먼저 처리 권장).

---

## 1. 로그인 사용자 하드코딩 — `src/App.tsx`
**현재**: `useState<User | null>`의 초기값이 실제 로그인 상태와 무관하게 하드코딩됨.
```ts
const [user, setUser] = useState<User | null>({
  id: "1", nickname: "noah", email: "noah0969@gmail.com", profileImageUrl: "",
});
```
**연동**: 초기값을 `null`로 바꾸고, 앱 시작 시 access token이 있으면 `getMyProfile()`(`apis/userApi.ts`)로 사용자 정보를 조회해 `setUser`. 토큰 없으면 로그아웃 상태 유지. 이걸 바꾸기 전까지 "항상 로그인된 것처럼" 보인다.

## 2. 가격 알림 전체가 목 — `src/pages/PriceAlertsPage.tsx`
가장 미완성 영역. api 모듈 자체가 없다.
- **마켓 목록 하드코딩**: `markets` 배열(BTC/ETH/XRP/SOL/DOGE 5종). → 백엔드 마켓 목록 API로 교체(존재 여부 `docs/API_CONTRACT.md`에서 확인 필요).
- **저장된 설정 목 데이터**: `mockSavedSettings`. → 마운트 시 `GET /price-alerts/me` 조회로 교체.
- **저장이 스텁**: `handleSubmit` 안에서 실제 저장 대신 `console.log('save price alert settings:', requestBody)` + 주석 처리된 `fetch` 예시. 저장 성공을 **로컬에서 흉내**냄(`convertFormToSavedSettings`). → `PUT /price-alerts/me` 실제 호출로 교체.
- **해야 할 일**: `src/apis/priceAlertApi.ts` 신규 생성(`getMyPriceAlertSettings`, `updateMyPriceAlertSettings`) → `apiClient` 사용. 요청 바디 diff 계산 로직(`priceAlertMapper.convertFormToRequest`)은 이미 완성됨, 재사용.

## 3. 내 채팅방 목 폴백 — `src/pages/MyChatRoomPage.tsx`
**현재**: API 호출은 실제(`getMyChatRooms`)지만, 실패(catch) 시 빈 배열 대신 `mockMyChatRooms`로 폴백한다.
```ts
} catch (error) {
  // setMyChatRooms([]);        ← 실제 동작(주석 처리됨)
  setMyChatRooms(mockMyChatRooms);  ← 목 폴백(현재 활성)
```
**연동**: `mockMyChatRooms` 상수 삭제, catch에서 빈 배열/에러 처리로 복원(주석 라인 활성화). 백엔드가 붙으면 실패 시 목이 뜨는 것은 디버깅을 방해한다.

## 4. 채팅방 제목 하드코딩 — `src/pages/ChatRoomPage.tsx`
**현재**: `const roomTitle = "비트코인 단기 시황방";` — 어떤 방을 들어가도 같은 제목.
**연동**: 채팅방 상세(제목 등)를 받아올 방법 필요. 옵션 (a) 방 목록에서 넘어올 때 쿼리스트링/state로 title 전달, (b) `GET /chat/room/{roomId}` 상세 API 추가(백엔드 확인 필요). `roomId`는 이미 쿼리스트링으로 받고 있음.

## 5. 알림 실시간 수신 미연결 + 테스트 버튼 — `src/App.tsx`, `src/pages/HomePage.tsx`
**현재**:
- `HomePage`는 `<h1>메인 페이지</h1>` + "테스트 알림 발생" 버튼뿐(플레이스홀더).
- 알림은 오직 이 버튼(`handleMockAlert`)이 만드는 가짜 `UpbitTickerAlertEvent`로만 생성된다.
- 실제 알림 스트림 구독이 App에 **없음**.
**연동**:
- 실제 알림 채널(STOMP destination 등, `notification` 서비스 확인)을 App에서 구독해 `handleReceiveUpbitTickerAlert`에 연결.
- `handleMockAlert` / HomePage 테스트 버튼 제거 또는 실제 홈 콘텐츠로 교체.
- 매핑 로직 `notificationMapper.mapUpbitTickerAlertToNotification`은 완성됨, 재사용.

## 6. HomePage 콘텐츠 미완성 — `src/pages/HomePage.tsx`
플레이스홀더 상태. 실제 랜딩/대시보드 콘텐츠 필요(제품 요구사항에 따름).

---

## 참고: 이미 실제 연동된(목 아님) 부분
아래는 이미 실 API/STOMP를 호출한다. 백엔드만 뜨면 동작 → 목으로 오해하지 말 것.
- 인기 채팅방 목록 조회 (`ChatPage` → `getPopularChatRooms`)
- 내 채팅방 조회/나가기 (`MyChatRoomPage`, 단 실패 폴백만 목 — 위 3번)
- 채팅방 생성/수정 (`Create/UpdateChatRoomPage`)
- 채팅 메시지 조회 + 실시간 송수신 (`ChatRoomPage`, STOMP)
- 내 채팅방 뱃지 실시간 (`MyChatRoomPage`, STOMP)
- 프로필 수정 (`ProfileEditPage` → `updateMyProfile`)
- OAuth2 로그인/로그아웃/토큰 재발급 (`LoginModal`, `authApi`, `apiClient` 인터셉터)

## 연동 순서 제안
1. **App 사용자 실연동**(1번) — 다른 모든 로그인 상태 판정의 기반.
2. **가격 알림 api 모듈 + 연동**(2번) — 신규 파일 필요, 범위가 가장 큼.
3. **내 채팅방 목 폴백 제거**(3번) — 한 줄 교체.
4. **채팅방 제목**(4번) — 라우팅/상세 API 결정 필요.
5. **알림 스트림 + HomePage**(5·6번) — 백엔드 알림 채널 확인 후.
