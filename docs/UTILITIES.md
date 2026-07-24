# UTILITIES — `src/utils` 레퍼런스

순수 함수 계층(`src/utils/*`)의 카탈로그. 모두 부수효과가 적은 헬퍼이며, 컴포넌트/페이지에서 재사용한다. 아키텍처적 위치(anti-corruption layer 등)는 `docs/ARCHITECTURE.md`.

## 개요
| 파일 | 분류 | 요약 |
| --- | --- | --- |
| `authStorage.ts` | 스토리지 | access token / 로그인 후 이동경로를 `sessionStorage`에 보관 |
| `dateFormatter.ts` | 포매터 | `Asia/Seoul` 기준 날짜/시간 표기 |
| `chatMessageUtils.ts` | 매퍼/헬퍼 | 채팅 메시지 생성·변환, `clientMessageId` 생성, 검증 |
| `userMapper.ts` | 매퍼 | `UserResponse` → `User` |
| `notificationMapper.ts` | 매퍼 | `UpbitTickerAlertEvent` → `Notification` |
| `priceAlertMapper.ts` | 매퍼 | 가격 알림 설정 ↔ 폼 ↔ PUT 요청(diff) |
| `priceAlertValidator.ts` | 검증 | 변화율 퍼센트 유효성 |

---

## `authStorage.ts` — 토큰/리다이렉트 스토리지
`sessionStorage` 래퍼. 상세 인증 흐름은 `docs/AUTH.md`.

| 함수 | 키 | 설명 |
| --- | --- | --- |
| `getAccessToken()` / `setAccessToken(t)` / `removeAccessToken()` | `accessToken` | access token 읽기/쓰기/삭제 |
| `saveRedirectAfterLogin(path)` | `redirectAfterLogin` | 미로그인 액션 시 목적지 저장 |
| `consumeRedirectAfterLogin()` | `redirectAfterLogin` | 값 읽고 **즉시 삭제**(1회성) |

- `sessionStorage` 사용 → 탭 닫으면 소멸.

---

## `dateFormatter.ts` — 한국 시간 표기
전부 `Intl.DateTimeFormat`, 타임존 `Asia/Seoul`. 파싱 실패 시 원본 문자열을 그대로 반환(방어적).

| 함수 | 출력 예 | 용도 |
| --- | --- | --- |
| `formatKoreanDateTime(v)` | `6월 11일 오전 10:10` | 목록/알림 시각 |
| `formatKoreanTime(v)` | `오전 10:10` | 시:분만 |
| `formatKoreanChatTime(v)` | 오늘=`오전 10:10`, 어제=`어제 오전 10:10`, 올해=`6월 11일 …`, 그 외=`2025년 …` | 채팅 말풍선/최근 메시지 |

- `formatKoreanChatTime`은 내부적으로 `Asia/Seoul` 날짜 키(`en-CA` `YYYY-MM-DD`)를 만들어 오늘/어제/올해를 판정한다.

---

## `chatMessageUtils.ts` — 채팅 메시지 헬퍼
채팅 도메인의 변환/생성 로직. `ChatRoomPage`가 사용.

| 함수 | 설명 |
| --- | --- |
| `createClientMessageId()` | `client-{timestamp}-{uuid}`. 낙관적 전송↔브로드캐스트 매칭 키 |
| `isValidRoomId(id)` | `NaN` 아니고 `> 0` |
| `createPendingChatMessage({...})` | 전송 즉시 표시할 `status: 'pending'` 메시지 생성(임시 id = `Date.now()`) |
| `mapChatMessageResponseItemToChatMessage(item)` | 조회 응답 → `ChatMessage`(`status: 'sent'`) |
| `mapBroadcastEventToChatMessage({event, fallbackWriterName})` | STOMP 브로드캐스트(flat payload) → `ChatMessage`. `messageId`/`roomId`를 `Number(...)`로, `timestamp`(epoch millis)를 `createdAt`(ISO)로 변환 |
| `getAvatarText(name)` | 이름 앞 2글자 대문자(아바타) |

> 채팅 메시지 상태 모델(`pending`/`sent`/`failed`)과 낙관적 전송 흐름은 `docs/PAGES.md`(채팅) 및 `docs/ARCHITECTURE.md`(핵심 패턴) 참고.

---

## 매퍼 계층 — 서버 타입 ↔ 화면 모델
서버 응답/이벤트 타입과 화면 모델을 분리하고 여기서만 변환한다(anti-corruption layer). 백엔드 DTO가 바뀌면 매퍼가 흡수하고 화면 모델은 지킨다.

### `userMapper.ts`
- `mapUserResponseToUser(res)` — `UserResponse{id,nickname,email,createdAt}` → `User{id,nickname,email}`(createdAt 버림).

### `notificationMapper.ts`
- `mapUpbitTickerAlertToNotification(event)` — `UpbitTickerAlertEvent` → `Notification`.
  - 변화율 `changeRate*100` → `%`(소수 2자리), 가격 천단위 콤마.
  - `messageParts`로 부분 굵게(`bold`)·줄바꿈(`lineBreakAfter`) 표현 → `Header`가 렌더.

### `priceAlertMapper.ts` — 가격 알림(핵심 로직)
화면(퍼센트 "3")과 서버(비율 0.03) 사이 변환 + 저장 diff 계산.

| 함수 | 설명 |
| --- | --- |
| `convertSettingsToForm(markets, saved)` | 저장 설정 + 마켓 메타 → 폼 모델(`PriceAlertSettingForm[]`). 마켓에 없는 코드는 제외 |
| `createEmptyPriceAlertSettingForm(market)` | 새로 추가한 코인의 기본 폼(enabled=true, 기본 퍼센트) |
| `convertFormToRequest(form, saved)` | 폼 vs 저장본 비교 → `{ creates, updates, deletes }` **diff** 생성 |
| `convertFormToSavedSettings(form)` | 저장 성공 후 폼 → 저장본 모델(삭제표시 제외) |

- 내부: `convertRateToPercent`(0.03→"3", 옵션에 없으면 기본값), `convertPercentToRate`("3"→0.03), `hasSameSetting`(변경 여부).
- diff 규칙: 삭제표시 & 저장돼 있으면 `deletes`, 저장 안 됐으면 `creates`, 값 바뀌었으면 `updates`.

### `priceAlertValidator.ts`
- `isValidTargetChangeRatePercent(value)` — 빈 값 아니고, 유한수이며 `> 0`.

---

## 컨벤션
- 이 계층은 **React/네트워크에 의존하지 않는다**(순수 함수). 테스트하기 쉬운 형태 유지.
- 새 도메인 추가 시 "서버 타입 → 화면 모델" 변환이 필요하면 `{domain}Mapper.ts`를 만든다. 컴포넌트 안에서 변환하지 않는다.
- 코드 스타일은 `.claude/rules/code-style.md`.
