# AUTH — 프론트엔드 인증 구현

프론트엔드의 인증이 실제로 어떻게 구현돼 있는지 정리한다. 중심은 `src/apis/authApi.ts`지만, 인증은 여러 파일에 걸쳐 있다.

## 관련 파일 한눈에
| 파일 | 역할 |
| --- | --- |
| `src/apis/authApi.ts` | OAuth2 로그인 URL 생성, 로그아웃 요청 |
| `src/apis/apiClient.ts` | 요청에 토큰 자동 첨부 + 401 시 자동 재발급/재시도 |
| `src/utils/authStorage.ts` | access token / 로그인 후 이동경로를 `sessionStorage`에 저장 |
| `src/pages/LoginSuccessPage/LoginSuccessPage.tsx` | OAuth2 리다이렉트 착지 → 토큰 저장 → 원경로 복귀 |
| `src/components/Modal/LoginModal.tsx` | 소셜 로그인 버튼(구글/카카오) |
| `src/App.tsx` | 로그아웃 처리, 로그인 사용자 상태 보유 |
| `src/apis/stompClient.ts` | WebSocket 핸드셰이크 URL 쿼리(`?access_token=`)로 토큰 전달 |

토큰 방식: **access token은 프론트가 `sessionStorage`로 보관**하고, **refresh token은 백엔드가 관리하는 쿠키**(httpOnly 추정)로 다룬다. 그래서 axios 인스턴스는 모두 `withCredentials: true`.

---

## `authApi.ts` — 구현 내용

```ts
export type OAuthProvider = 'google' | 'kakao';

// 소셜 로그인 시작 URL. 이 URL로 브라우저를 "이동"시킨다(fetch 아님).
export function getOAuthLoginUrl(provider: OAuthProvider) {
  return `${GATEWAY_URL}/oauth2/authorization/${provider}`;
}

// 로그아웃. 서버 세션/refresh 토큰 무효화 요청.
export async function logout() {
  await apiClient.post('/auth/logout');
}
```

- `getOAuthLoginUrl`은 **문자열만 반환**한다. 실제 이동은 `LoginModal`이 `<a href>`로 수행한다. 이는 OAuth2가 브라우저 리다이렉트 기반이라 XHR로 처리할 수 없기 때문이다.
- `logout`은 `apiClient`(토큰 첨부됨)로 `POST /auth/logout`을 보낸다. 클라이언트 측 토큰 삭제는 여기서 하지 않고 호출부(`App.handleLogout`)가 담당한다.
- 토큰 **재발급**(`/auth/refresh`)은 이 파일이 아니라 `apiClient.ts` 인터셉터 안에 있다(아래 참고).

---

## 전체 흐름

### 1) 로그인
1. `LoginModal`에서 구글/카카오 버튼 = `getOAuthLoginUrl(provider)`를 `href`로 가진 링크.
   ```tsx
   <a href={getOAuthLoginUrl('google')}> ... </a>
   ```
2. 브라우저가 `GATEWAY_URL/oauth2/authorization/{provider}`로 이동 → 백엔드가 소셜 인증을 처리.
3. 인증 성공 시 백엔드가 `/login-success?accessToken=...`로 **리다이렉트**.
4. `LoginSuccessPage`가 쿼리스트링에서 `accessToken`을 꺼낸다.
   - 토큰 없으면 `alert` 후 `/`로 이동(실패 처리).
   - 있으면 `setAccessToken(token)`으로 `sessionStorage` 저장.
   - `consumeRedirectAfterLogin()`으로 "로그인 전에 가려던 경로"를 꺼내 그곳으로 이동(없으면 `/`).

> 로그인 후 사용자 정보(`user`) 채우기는 **현재 미구현**이다. `App.tsx`가 사용자를 하드코딩하고 있어서(`docs/MOCK_DATA.md` 1번), 실연동 시 이 시점 또는 앱 시작 시 `getMyProfile()` 호출로 연결해야 한다.

### 2) 인증된 요청 (요청 인터셉터) — `apiClient.ts`
모든 `apiClient` 요청에 토큰을 자동으로 붙인다.
```ts
apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();      // sessionStorage
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});
```
→ 개별 API 함수는 토큰을 신경 쓸 필요가 없다. `apiClient`만 쓰면 자동 적용.

### 3) 토큰 만료·자동 재발급 (응답 인터셉터) — `apiClient.ts`
401이 오면 refresh 토큰으로 새 access token을 받아 **원요청을 1회 재시도**한다.
```
요청 → 401 응답
  ├─ 아래 조건이면 재발급 안 하고 그대로 실패:
  │    · 401이 아님 / 이미 재시도함(_retry) / 요청 자체가 /auth/refresh
  └─ 그 외:
       originalRequest._retry = true
       refreshAccessTokenOnce(): POST /auth/refresh (authClient, 쿠키 기반)
         ──▶ 새 access token은 응답 body가 아니라 Authorization 헤더(Bearer)에서 추출
         성공: setAccessToken(new) → 원요청 헤더 갱신 → apiClient(originalRequest) 재시도
         실패: removeAccessToken() + saveRedirectAfterLogin(현재 경로) → 원 에러 전파
```
포인트:
- **single-flight**: 동시에 터진 401은 `refreshPromise` 하나로 합쳐 재발급을 한 번만 보낸다(`refreshAccessTokenOnce`).
- `_retry` 플래그로 **무한 재시도 방지**(재발급 후에도 401이면 한 번 더 시도하지 않음).
- 재발급 요청은 별도 인스턴스 `authClient`로 보낸다(요청 인터셉터가 없어 만료된 토큰을 붙이지 않기 위함).
- `/auth/refresh` 자체가 401이면 재귀 방지를 위해 건너뛴다.
- 재발급 실패 시 토큰을 지우고 **돌아올 경로만 저장**(`saveRedirectAfterLogin`)한다. **화면 리다이렉트는 하지 않는다** → 각 페이지가 `user === null`로 안내(로그인 모달 유도)를 처리.
- 경로·응답 계약은 `docs/API_CONTRACT.md` §2 인증.

### 4) 로그아웃 — `App.handleLogout`
```ts
try { await logout(); }               // POST /auth/logout (서버 무효화)
catch (e) { alert(...); }             // 실패해도 아래 finally로 진행
finally {
  removeAccessToken();                // 로컬 토큰 삭제
  setUser(null);                      // 전역 사용자 초기화
  setNotifications([]);               // 알림 초기화
  navigate('/', { replace: true });   // 홈으로
}
```
서버 요청이 실패해도 `finally`에서 **클라이언트 상태는 반드시 정리**한다.

### 5) WebSocket 인증 — `stompClient.ts`
STOMP 연결은 같은 access token을 **핸드셰이크 URL 쿼리로** 실어 보낸다(게이트웨이 `WebsocketHandshakeAuthWebFilter`가 쿼리 `access_token`으로 인증).
```ts
// connectHeaders가 아니라 SockJS 핸드셰이크 URL 쿼리로 넘긴다(재연결마다 최신 토큰).
new SockJS(`${GATEWAY_URL}/ws?access_token=${getAccessToken()}`);
```
- 단, STOMP에는 axios 같은 **401 자동 재발급 로직이 없다.** 연결 시점의 토큰이 만료됐다면 재연결(`reconnectDelay: 5000`)만 반복될 수 있다. (개선 여지)

---

## 토큰 저장소 — `authStorage.ts`
| 함수 | 키(sessionStorage) | 설명 |
| --- | --- | --- |
| `getAccessToken` / `setAccessToken` / `removeAccessToken` | `accessToken` | access token 읽기/쓰기/삭제 |
| `saveRedirectAfterLogin(path)` | `redirectAfterLogin` | 로그인 필요 액션에서 미로그인 시 목적지 저장 |
| `consumeRedirectAfterLogin()` | `redirectAfterLogin` | 값 읽고 **즉시 삭제**(1회성) |

- `sessionStorage` 사용 → **탭을 닫으면 access token 소멸**. 재방문 시 refresh 쿠키가 살아있으면 첫 401에서 재발급으로 복구되는 구조.
- `saveRedirectAfterLogin` 사용 예: `Header`에서 미로그인 상태로 "가격 알림" 클릭 시 `/price-alerts`를 저장하고 로그인 모달을 연다 → 로그인 후 그 페이지로 복귀.

---

## 관련 계약
요청/응답 계약(소셜 로그인·재발급·로그아웃 경로와 응답 형태)의 정본은 **`docs/API_CONTRACT.md` §2 인증**이다. 이 문서는 프론트 구현 흐름만 다룬다.

## 확인/개선 여지 (실연동 시 검토)
- 로그인 성공 후 `getMyProfile()`로 `user` 채우기 연결(현재 하드코딩).
- STOMP 연결 토큰 만료 시 재발급 전략 부재.
- refresh 토큰의 실제 저장 방식(쿠키 속성)과 `/auth/refresh`가 참조하는 자격증명 — 백엔드(`oauth2-*`, gateway) 대조.
