# TODO — React ↔ 백엔드 실연동

React SPA를 실제 API Gateway에 붙이기 위한 **레거시(js+html) → React 이식** 작업 목록이었다. 근거는 (a) 삭제된 레거시 연동 코드(커밋 `5603cb9`)와 (b) 실제 백엔드 소스(`../crypto-project-backend`)다.

> ✅ **이식 완료**: 통신 계약 정정, 인증 흐름(§2), STOMP 핸드셰이크(§3), 채팅 실시간(§4: 낙관적 전송·ACK·타임아웃·브로드캐스트/중복제거·이전 메시지·방 상세/제목·읽음 보고·타 유저 프로필·배지 재정렬)까지 모두 반영됐다. 구현 내용은 코드와 `docs/`(`AUTH.md`·`PAGES.md`·`API_CONTRACT.md`) 참고.

## 남은 프론트 실연동 작업

레거시 이식은 끝났고, 남은 건 아직 목/스텁으로 동작하는 신규 영역이다. 대상·절차는 `docs/MOCK_DATA.md`에서 관리한다.

- **가격 알림 전체**(api 모듈 신규 생성 필요) — `MOCK_DATA.md` §2
- **알림 실시간 수신 연결**(STOMP `/user/topic/notification/` 구독) — `MOCK_DATA.md` §5 · 계약 `API_CONTRACT.md` §4
- **HomePage 실제 콘텐츠** — `MOCK_DATA.md` §6

## 참고 (현재 React 파일 배치 · 관련 문서)

- 통신: `src/apis/{apiClient,authApi,stompClient,chatStompApi,chatRoomApi,chatMessageApi,userApi}.ts`, `src/constants/api.ts`.
- 유틸: `src/utils/{authStorage,chatMessageUtils,dateFormatter,userMapper,...}.ts`. 토큰 저장은 `authStorage.ts`.
- 화면: `src/pages/*`(ChatRoomPage·MyChatRoomPage·LoginSuccessPage·CreateChatRoomPage·UpdateChatRoomPage 등).
- 문서: 구조 `docs/ARCHITECTURE.md`, 화면 `docs/PAGES.md`, 계약 `docs/API_CONTRACT.md`, 인증 `docs/AUTH.md`, 목 교체 대상 `docs/MOCK_DATA.md`, 규칙 `.claude/rules/backend-integration.md`.
- 검증: 각 단계 후 `npm run build`(타입체크) + `npm run lint`. 가능하면 게이트웨이 띄우고 `npm run dev`로 플로우 확인.
- 백엔드 계약 원천(다른 저장소 `../crypto-project-backend`): STOMP `common-core/.../StompDestination.java`·`websocket-gateway/.../StompConfig.java`, 재발급 `oauth2-client/.../AuthController.java`, 채팅 REST `chat/.../ChatRoomController.java`, 라우팅 `git-config-repo/dynamic/api-gateway.yml`.
