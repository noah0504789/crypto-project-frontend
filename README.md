# crypto-project-frontend

`crypto-project` 백엔드(Spring Cloud MSA)의 프론트엔드. **React 19 · TypeScript · Vite** 기반 SPA로 가상화폐 오픈채팅과 가격 알림을 제공한다. 모든 REST/WebSocket 요청은 API Gateway 한 곳(`VITE_GATEWAY_URL`)으로 나간다.

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

- `VITE_GATEWAY_URL`(`.env`) — API Gateway 주소. 예: `https://localhost:8000`. 코드에서는 `src/constants/api.ts`의 `GATEWAY_URL`로만 접근한다.

## 문서

- `CLAUDE.md` — 작업 규칙·문서 안내 진입점
- `docs/ARCHITECTURE.md` — 구조·계층·의존 방향·통신·핵심 패턴
- `docs/PAGES.md` — 화면별 역할·기능·플로우
- `docs/UTILITIES.md` — `src/utils` 순수 함수/매퍼 레퍼런스
- `docs/AUTH.md` — 인증 구현(토큰·인터셉터·OAuth2 흐름)
- `docs/API_CONTRACT.md` — 백엔드 REST/STOMP 계약(**계약 값의 정본**)
- `docs/MOCK_DATA.md` — 목/스텁 교체 대상(실연동 단계)
- `TODO.md` — 백엔드 실연동 작업 목록
- `.claude/rules/code-style.md` — 코드 스타일 규칙
