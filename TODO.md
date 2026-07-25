# TODO — React ↔ 백엔드 실연동

React SPA를 실제 API Gateway에 연동하기 위한 **남은** 작업 목록. 근거는 **(a) React 이전 js+html 버전의 실동작 연동 코드**(커밋 `5603cb9`, 이후 `01d6f03`에서 삭제됨 → 이 파일이 유일 기록)와 **(b) 실제 백엔드 소스 확인 결과**(`../crypto-project-backend`)다.

> **이 파일만 보고 작업 가능하도록** 각 항목에 근거 파일·구현 절차·필요한 레거시 코드를 인라인했다.
> 현재 React는 **UI 완성 + 부분 목(mock)** 상태다. 목 교체 대상은 `docs/MOCK_DATA.md`, 규칙은 `.claude/rules/backend-integration.md`.
> **통신 계약(REST/STOMP 경로·payload·status·인증)의 정본은 `docs/API_CONTRACT.md`**다. 아래 태스크의 엔드포인트/destination/payload 값은 그 문서를 기준으로 삼는다.
> 완료 항목(통신 계약 정정, 인증 흐름 §2, STOMP 핸드셰이크, 채팅 실시간 핵심: 낙관적 전송·ACK·브로드캐스트/중복제거·이전 메시지 로딩)은 이 목록에서 제거했다. 구현 내용은 코드와 `docs/`(특히 `AUTH.md`) 참고.

## 남은 작업(요약)

채팅 §4 마감이 전부다: 4.3 ACK 타임아웃, 4.5 방 상세/제목, 4.7 활동·읽음 보고, 4.8 아바타 프로필 연결, 4.9 배지 재정렬. 그 외 가격 알림·홈·알림 실시간 연동은 `docs/MOCK_DATA.md` §2·5·6.

---

## 4. 채팅 실시간 프로토콜 보강 (`ChatRoomPage.tsx` + `chatStompApi.ts`)

낙관적 전송·ACK·브로드캐스트/중복제거·이전 메시지 로딩은 완료. 남은 건 아래 보강 항목이다(레거시 `websocket-stomp-chat.js` 참고).

- [~] **4.3 ACK 타임아웃** — 재전송은 구현(`ChatRoomPage.handleResend`), **3초 ACK 타임아웃은 미구현**
  - 현재: `failed` 말풍선의 재전송(↻) → 새 `clientMessageId`로 재발행 + `pending` 복귀.
  - 남음: ACK 무응답 시 실패 처리하는 타이머가 없다(발행 자체가 throw할 때만 `failed`). 무응답 케이스는 `pending`으로 남는다. 레거시식 3초 타이머:
    ```js
    function retry(id) { const e = pending.get(id); if (!e) return;
      clearTimeout(e.timer); e.timer = setTimeout(() => onTimeout(id), 3000);
      stompClient.publish({ destination: '/msg/chat.send',
        body: JSON.stringify({ clientMessageId: id, roomId, writerId: myId, content: e.content }) }); }
    ```

- [~] **4.5 방 상세 조회 / 제목** — 메시지 조회+하단 스크롤은 구현, **방 상세 조회는 미구현**
  - 현재: 마운트 시 `getChatMessages()`(최신, limit 10) → reverse → 렌더 후 최하단 스크롤. `user`는 props로 받으므로 별도 프로필 조회 불필요.
  - 남음: `GET /chat/room/{roomId}`로 방 상세(제목 등)를 조회하지 않아 **`roomTitle`이 하드코딩**(`"비트코인 단기 시황방"`, MOCK_DATA #4). `lastMsgSeq` 기반 로직도 현재 미사용.

- [ ] **4.7 활동/읽음 보고** — `beforeunload`에서 활동 보고(엔드포인트·params 계약은 API_CONTRACT §2 채팅방). 언로드 유실 방지 위해 `fetch(keepalive:true)` + `Authorization` 헤더 수동.
    ```js
    fetch(`${GATEWAY_URL}/chat/room/${roomId}/activity?lastMsgSeq=${lastMsgSeq}&lastMsgMs=${lastTs ?? 0}`,
      { method: 'PUT', headers: { authorization: `Bearer ${getAccessToken()}` }, keepalive: true }).catch(()=>{});
    ```

- [~] **4.8 타 유저 프로필 캐시** — API는 구현, **페이지 연결 미완**
  - 현재: `userApi.ts`에 `getUserProfile(userId)`(모듈 캐시 `Map` + in-flight dedup). 응답 계약(`/user/{userId}/profile` = `UserResponse` → `mapUserResponseToUser`)은 API_CONTRACT §2 사용자.
  - 남음: `ChatRoomPage`의 아바타/닉네임 표시에서 `getUserProfile()` 호출 연결(현재 미사용).

- [~] **4.9 내 채팅방 목록 배지** — 구독+갱신은 구현, **재정렬/미존재 방 처리는 미구현**
  - 현재: `MyChatRoomPage`에서 `subscribeMyChatRoomBadge` 구독(`/user/queue/chat/badge`). 이벤트의 `memberIds`로 내 방인지 확인 후 해당 방의 `unreadMsgCnt+1`·`lastMsgContent`·`lastMsgCreatedAt` 갱신. 계약은 API_CONTRACT §3.
  - 남음: 갱신된 방을 목록 **맨 앞으로 이동**하지 않고 제자리 갱신만 한다(`.map`). 목록에 없는 방일 때 **단건 조회 후 prepend**도 미구현.

---

## 5. 참고 (현재 React 파일 배치 · 관련 문서)

- 통신: `src/apis/{apiClient,authApi,stompClient,chatStompApi,chatRoomApi,chatMessageApi,userApi}.ts`, `src/constants/api.ts`.
- 유틸: `src/utils/{authStorage,chatMessageUtils,dateFormatter,userMapper,...}.ts`. 토큰 저장은 `authStorage.ts`.
- 화면: `src/pages/*`(ChatRoomPage·MyChatRoomPage·LoginSuccessPage·CreateChatRoomPage·UpdateChatRoomPage 등).
- 문서: 구조 `docs/ARCHITECTURE.md`, 화면 `docs/PAGES.md`, 계약 `docs/API_CONTRACT.md`, 인증 `docs/AUTH.md`, 목 교체 대상 `docs/MOCK_DATA.md`, 규칙 `.claude/rules/backend-integration.md`.
- 검증: 각 단계 후 `npm run build`(타입체크) + `npm run lint`. 가능하면 게이트웨이 띄우고 `npm run dev`로 플로우 확인.
- 백엔드 계약 원천(다른 저장소 `../crypto-project-backend`): STOMP `common-core/.../StompDestination.java`·`websocket-gateway/.../StompConfig.java`, 재발급 `oauth2-client/.../AuthController.java`, 채팅 REST `chat/.../ChatRoomController.java`, 라우팅 `git-config-repo/dynamic/api-gateway.yml`.
