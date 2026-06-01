## 주요 파일

```text
assets/js/config.js              # gateway, 프론트 라우트 상수
assets/js/auth-api.js            # axios client, accessToken/refresh 처리
assets/js/stomp-client.js        # STOMP client 공통화
assets/js/utils.js               # 날짜 포맷, uuid, CSS escape 등 공통 유틸
assets/js/room-form.js           # 채팅방 생성/수정 폼 에러 처리 공통화
assets/images/google-login.png   # 구글 로그인 이미지
assets/images/kakao-login.png    # 카카오 로그인 이미지
```

## 실행 전 확인

`assets/js/config.js`에서 API Gateway 주소를 환경에 맞게 바꾸면 됩니다.

```js
export const GATEWAY_URL = 'https://localhost:8000';
```

로컬 정적 서버에서 실행하는 것을 권장합니다.
