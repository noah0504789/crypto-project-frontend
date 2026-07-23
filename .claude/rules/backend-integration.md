# BACKEND INTEGRATION

목 데이터를 실제 백엔드로 교체할 때의 규칙. 대상 전체 목록은 `docs/MOCK_DATA.md`, 계약은 `docs/API_CONTRACT.md`.

## 시작 전
1. `docs/MOCK_DATA.md`에서 교체 대상과 권장 순서 확인.
2. 대상 엔드포인트의 **실제 백엔드 계약을 확인**한다(추측 금지). 백엔드 위치: `../crypto-project-backend`.
   - REST: 해당 서비스의 `*-adapter-in/.../web/*Controller.java`
   - STOMP destination: `common/common-core/.../StompDestination.java`, `websocket-gateway/.../StompController.java`
   - 게이트웨이 라우팅: `spring-cloud-api-gateway`
3. 프론트 기대 타입(`src/types/*`)과 백엔드 DTO가 다르면, **매퍼(`utils/*Mapper.ts`)에서 흡수**한다. 화면 모델을 함부로 바꾸지 않는다.

## 진행 규칙
- 컴포넌트에서 직접 `fetch`/`axios` 쓰지 말고 `src/apis/{domain}Api.ts`에 함수를 만든다(`apiClient` 사용 → 토큰/401 재발급 자동).
- 신규 api 모듈이 필요한 대표 사례: **가격 알림**(`priceAlertApi.ts` 없음). `getMyPriceAlertSettings`, `updateMyPriceAlertSettings`를 만들고, 요청 바디 diff는 기존 `priceAlertMapper.convertFormToRequest`를 재사용.
- 목 상수(`mockMyChatRooms`, `mockSavedSettings`, `markets` 하드코딩, `roomTitle` 등)와 테스트 스텁(`handleMockAlert`, `console.log` 저장)은 **연동 완료 후 제거**한다. 남기면 실패 시 목이 떠서 디버깅을 방해한다.
- 한 번에 한 대상만 교체하고 각 단계 후 `npm run build`(타입 체크)로 검증.

## 인증/토큰
- Access token은 `sessionStorage`(`utils/authStorage.ts`), 요청/401 재발급은 `apiClient` 인터셉터가 처리. 새 API도 `apiClient`만 쓰면 자동 적용된다. 토큰 로직을 개별 호출에서 다시 구현하지 않는다.
- 로그인 사용자 실연동(`App.tsx`): 초기 `user`를 `null`로, 토큰 있으면 `getMyProfile()`로 채운다. 이게 되기 전엔 모든 화면이 "로그인됨"으로 보인다.

## STOMP
- 구독/발행은 `apis/chatStompApi.ts` 헬퍼로 추가한다. destination 문자열은 상수로 모으고 백엔드와 대조.
- 실시간 알림 연동 시: `App`에서 알림 채널을 구독해 `handleReceiveUpbitTickerAlert`로 연결(현재 미연결). 채널 방식은 `notification` 서비스 확인.

## 검증
- `npm run build`(= `tsc -b && vite build`)로 타입 안전성 확인. `npm run lint`.
- 가능하면 실제 게이트웨이(`VITE_GATEWAY_URL`)를 띄운 상태에서 `npm run dev`로 해당 플로우를 직접 확인.
- 완료 보고: `원인 → 수정 → 영향 범위 → 검증(실행/결과)`.
