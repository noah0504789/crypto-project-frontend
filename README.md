# crypto-project-frontend

`crypto-project` 백엔드(Spring Cloud MSA)의 프론트엔드. **React 19 · TypeScript · Vite** 기반 SPA로 가상화폐 오픈채팅, 가격 알림, 계정/프로필 관리를 제공한다. 모든 REST/WebSocket 요청은 API Gateway 한 곳(`VITE_GATEWAY_URL`)으로 나간다.

> **현재 상태: 백엔드 실연동 완료.** 인증·채팅(REST/STOMP)·가격 알림·실시간 알림 수신이 모두 실제 API Gateway에 연결돼 있다(목/스텁 제거됨). 남은 것은 제품 콘텐츠(HomePage)와 선택적 개선 항목뿐 — `TODO.md` 참고.

## 주요 기능

| 카테고리 | 라우트 | 설명 |
| --- | --- | --- |
| 홈 | `/` | 랜딩(현재 플레이스홀더) |
| 채팅 | `/chat`, `/chat/my`, `/chat/create`, `/chat/update`, `/chat/room` | 가상화폐 오픈채팅 — 인기/내 채팅방, 생성·수정, 실시간 메시지(STOMP, 낙관적 전송) |
| 가격 알림 | `/price-alerts` | 코인별 변화율 알림 설정 |
| 알림 | (페이지 아님) | Header 벨 드롭다운 + `App` 전역 상태로 실시간 알림 수신 |
| 계정 | `/account`, `/account/profile-edit` | 계정 셸 + 프로필(닉네임) 수정 |
| 인증 | `/login-success`, `LoginModal` | OAuth2(구글/카카오) 소셜 로그인 |

화면별 상세 역할·플로우는 [`docs/PAGES.md`](docs/PAGES.md).

## 기술 스택

- **React 19** 함수 컴포넌트 + Hooks (클래스 컴포넌트 없음)
- **Vite 8** — `@` → `src` alias, `tsc -b && vite build`(타입 에러 시 빌드 실패)
- **TypeScript** — `verbatimModuleSyntax`(타입 import는 `import type` 필수)
- **react-router-dom v7** (`BrowserRouter`)
- **axios**(REST, `src/apis/apiClient.ts` — access token/refresh 인터셉터)
- **@stomp/stompjs + native WebSocket**(`src/apis/stompClient.ts`)
- 전역 상태: 라이브러리 없음. `App.tsx`가 최소 전역 상태(user, notifications)만 보유하고 props로 하향 전달

## 실행

```bash
npm install
npm run dev      # Vite 개발 서버
npm run build    # tsc -b && vite build (타입 에러가 있으면 실패)
npm run lint     # eslint
npm run preview  # 빌드 결과 미리보기
```

검증은 `npm run build`(타입 체크 포함)와 `npm run lint`가 기본이다. 테스트 러너는 아직 없다.

## 환경 변수

- `VITE_GATEWAY_URL`(`.env`) — API Gateway 주소. 예: `https://localhost:8000`. 코드에서는 `src/constants/api.ts`의 `GATEWAY_URL`로만 접근한다(`import.meta.env`를 직접 흩뿌리지 않는다).

## 프로젝트 구조

```
src/
  main.tsx              # 엔트리. BrowserRouter로 App 감쌈
  App.tsx               # 라우트 정의 + 전역 상태(user, notifications)
  constants/api.ts      # GATEWAY_URL
  apis/                 # 통신 계층 (REST: apiClient / STOMP: stompClient)
  types/                # 도메인 타입 + 서버 요청/응답 타입
  utils/                # 순수 함수: 매퍼·포매터·스토리지·검증
  components/           # 재사용 UI (폴더당 .tsx + .css)
  pages/                # 라우트 단위 화면 (폴더 단위)
  assets/               # 이미지
```

의존 방향은 `pages/components` → `apis` → `utils/types` 한 방향. 상세는 [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## 문서

- [`CLAUDE.md`](CLAUDE.md) — 작업 규칙·문서 안내 진입점
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — 구조·계층·의존 방향·통신·핵심 패턴
- [`docs/PAGES.md`](docs/PAGES.md) — 화면별 역할·기능·플로우
- [`docs/UTILITIES.md`](docs/UTILITIES.md) — `src/utils` 순수 함수/매퍼 레퍼런스
- [`docs/AUTH.md`](docs/AUTH.md) — 인증 구현(토큰·인터셉터·OAuth2 흐름)
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — 백엔드 REST/STOMP 계약(**계약 값의 정본**)
- [`TODO.md`](TODO.md) — 백엔드 실연동 작업 목록
- [`.claude/rules/code-style.md`](.claude/rules/code-style.md) — 코드 스타일 규칙
- [`.claude/rules/backend-integration.md`](.claude/rules/backend-integration.md) — 목 → 실연동 규칙
