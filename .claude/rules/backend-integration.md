# BACKEND INTEGRATION

새 백엔드 연동(REST/STOMP)을 추가하거나 기존 연동을 수정할 때의 규칙. 계약의 정본은 `docs/API_CONTRACT.md`. (초기 목→실연동 이행은 완료됨.)

## 시작 전
1. 대상 엔드포인트의 **실제 백엔드 계약을 확인**한다(추측 금지). 백엔드 위치: `../crypto-project-backend`.
   - REST: 해당 서비스의 `*-adapter-in/.../web/*Controller.java`
   - STOMP destination: `common/common-core/.../StompDestination.java`, `websocket-gateway/.../StompController.java`
   - 게이트웨이 라우팅: `spring-cloud-api-gateway`
2. 프론트 기대 타입(`src/types/*`)과 백엔드 DTO가 다르면, **매퍼(`utils/*Mapper.ts`)에서 흡수**한다. 화면 모델을 함부로 바꾸지 않는다.

## 진행 규칙
- 컴포넌트에서 직접 `fetch`/`axios` 쓰지 말고 `src/apis/{domain}Api.ts`에 함수를 만든다(`apiClient` 사용 → 토큰/401 재발급 자동).
- 신규 api 모듈 추가의 참고 예: **가격 알림**(`priceAlertApi.ts` — `getMarkets`/`getMyPriceAlertSettings`/`updateMyPriceAlertSettings`, 연동 완료). 서버 타입은 `types/priceAlert.ts`, 변환은 `priceAlertMapper.ts`(diff `convertFormToRequest`, 마켓 `mapMarketResponseToPriceAlertMarket`)에 두고 컴포넌트는 화면 모델만 다루는 구조를 따른다.
- 목/스텁 데이터·테스트 버튼은 연동 완료 후 **반드시 제거**한다(남기면 실패 시 목이 떠 디버깅을 방해). 초기 목 상수·스텁은 모두 제거됨 — 새로 도입하지 않는다.
- 조회 실패는 목으로 폴백하지 말고 **에러 상태**(예: `loadError` + "다시 시도")로 드러낸다.
- 한 번에 한 대상만 교체하고 각 단계 후 `npm run build`(타입 체크)로 검증.

## 인증/토큰
- Access token은 `sessionStorage`(`utils/authStorage.ts`), 요청/401 재발급은 `apiClient` 인터셉터가 처리. 새 API도 `apiClient`만 쓰면 자동 적용된다. 토큰 로직을 개별 호출에서 다시 구현하지 않는다.
- 로그인 사용자는 `App.tsx`가 앱 시작 시 토큰이 있으면 `getMyProfile()`로 복원한다(구현 완료). 인증 관련 전역 상태는 이 패턴을 따른다.

## STOMP
- 구독/발행은 도메인별 `apis/*StompApi.ts` 헬퍼로 추가한다(`chatStompApi.ts`, `notificationStompApi.ts`). destination 문자열은 상수로 모으고 백엔드와 대조.
- 실시간 알림은 `App`이 `notificationStompApi.subscribeWebNotifications`로 `/user/topic/notification/`을 구독해 연결돼 있다(구현 완료). user-destination은 `/user` prefix가 붙는 점에 주의.

## 검증
- `npm run build`(= `tsc -b && vite build`)로 타입 안전성 확인. `npm run lint`.
- 가능하면 실제 게이트웨이(`VITE_GATEWAY_URL`)를 띄운 상태에서 `npm run dev`로 해당 플로우를 직접 확인.
- 완료 보고: `원인 → 수정 → 영향 범위 → 검증(실행/결과)`.
