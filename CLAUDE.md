# CLAUDE.md

이 파일은 모든 작업에 항상 필요한 짧은 공통 규칙만 담는다. 상세 규칙은 `.claude/rules/`, 사람이 읽는 설명은 `docs/`에 있다.

## 프로젝트 개요
React 19 · TypeScript · Vite 기반 SPA. `crypto-project` 백엔드(Spring Cloud MSA)의 프론트엔드로, 가상화폐 오픈채팅, 가격 알림, 계정/프로필 관리를 제공한다. 모든 API/WebSocket 요청은 API Gateway 한 곳(`VITE_GATEWAY_URL`)으로 나간다.

- 라우팅: `react-router-dom` v7 (`BrowserRouter`)
- HTTP: `axios` (`src/apis/apiClient.ts`, access token/refresh 인터셉터)
- 실시간: `@stomp/stompjs` + `sockjs-client` (`src/apis/stompClient.ts`)
- 전역 상태: 라이브러리 없음. `App.tsx`의 `useState`(user, notifications)를 props로 하향 전달한다.

문서 안내:
- `docs/ARCHITECTURE.md` — 계층·의존 방향·통신·핵심 패턴
- `docs/PAGES.md` — 카테고리별 화면 역할·기능·플로우(알림 포함)
- `docs/UTILITIES.md` — `src/utils` 순수 함수/매퍼 레퍼런스
- `docs/AUTH.md` — 인증 구현(토큰·인터셉터·OAuth2 흐름)
- `docs/API_CONTRACT.md` — 백엔드 REST/STOMP 계약(**계약 값의 정본**)
- `TODO.md` — 남은 작업(백엔드 실연동은 모두 완료, 개선 여지·제품 과제만 남음)

> **현재 상태: 백엔드 실연동 완료.** 인증·채팅(REST/STOMP)·가격 알림·실시간 알림 수신이 모두 실제 게이트웨이에 연결돼 있다(목/스텁 제거됨). 새 기능은 기존 연동 패턴(`apis/*` + `types/*` + `utils/*Mapper.ts`)을 따른다.

## 명령어
```bash
npm run dev      # Vite 개발 서버
npm run build    # tsc -b && vite build (타입 에러가 있으면 빌드 실패)
npm run lint     # eslint
npm run preview  # 빌드 결과 미리보기
```
검증은 `npm run build`(타입 체크 포함)와 `npm run lint`가 기본이다. 테스트 러너는 아직 없다.

## 환경 변수
- `VITE_GATEWAY_URL` (`.env`) — API Gateway 주소. 예: `https://localhost:8000`. 코드에서는 `src/constants/api.ts`의 `GATEWAY_URL`로만 접근한다.

## 규칙 참조 (작업 유형별 — 필요 시 해당 파일을 읽는다)
| 작업 | 읽을 규칙 |
| --- | --- |
| 컴포넌트/페이지/유틸 작성·수정, 네이밍, 파일 구조 | `.claude/rules/code-style.md` |
| 신규 백엔드 연동(REST/STOMP) 추가, api 모듈 작성 | `.claude/rules/backend-integration.md` |

## 서브에이전트 (`.claude/agents/`)
컨텍스트를 분리해야 이득인 작업(중간 읽기량이 크고 결론은 작은 작업)만 위임한다. 규칙·계약의 정본은 `.claude/rules/`와 `docs/`이며 에이전트는 그것을 자기 컨텍스트에서 실행할 뿐이다.

| 에이전트 | 언제 |
| --- | --- |
| `frontend-explorer` | 화면→apis→types→utils 흐름 추적, 백엔드 계약의 프론트 소비 지점 파악(읽기 전용) |
| `frontend-verifier` | `npm run build`(타입 체크) + `npm run lint` 실행 후 에러 압축 보고 |

코드 수정은 서브에이전트에 위임하지 않는다. 백엔드·인프라까지 걸친 요청의 조사 순서는 `../crypto-project-backend/.claude/skills/cross-repo-impact/SKILL.md`를 따른다.

## 작업 절차
1. 관련 문서/규칙 확인 (`docs/`, `.claude/rules/`)
2. 전체 호출 흐름 파악 — 페이지 → `apis/*` → 타입, 또는 STOMP 구독 경로
3. 파일 경로 근거로 현재 동작 설명
4. 최소 변경 계획 제시
5. 필요한 파일만 수정
6. `npm run build` + `npm run lint`로 검증
7. 결과를 사실대로 보고

## 의사소통
- 한국어로 설명한다. `원인 → 수정 → 영향 범위 → 검증` 순서를 따른다.
- 코드 설명 시 관련 파일 경로·함수명을 함께 제시한다(예: `src/pages/ChatRoomPage/ChatRoomPage.tsx`의 `handleSubmit`).
- 근거를 확인할 수 없는 내용은 추측하지 않고 `확인 필요`로 표시한다. 특히 백엔드 응답 형태는 `docs/API_CONTRACT.md`와 실제 백엔드(`../crypto-project-backend`)를 대조해 확인한다.

## 코드 스타일
컴포넌트·타입·import·네이밍·파일 구조·모델 분리 등 코드 스타일 규칙은 **`.claude/rules/code-style.md`**를 따른다(컴포넌트/페이지/유틸 작성·수정 시 반드시 참조).
