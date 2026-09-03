import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken } from '@/utils/authStorage';

// 게이트웨이(WebsocketHandshakeAuthWebFilter)는 핸드셰이크 URL 쿼리 access_token으로 인증한다.
// STOMP connectHeaders가 아니라 SockJS 핸드셰이크 URL 쿼리로 토큰을 넘겨야 한다.
function createWebSocketUrl() {
  const accessToken = getAccessToken();

  return accessToken
    ? `${GATEWAY_URL}/ws-sockjs?access_token=${accessToken}`
    : `${GATEWAY_URL}/ws-sockjs`;
}

export function createStompClient() {
  return new Client({
    // 재연결마다 최신 토큰을 읽도록 URL을 팩토리 내부에서 만든다.
    webSocketFactory: () => new SockJS(createWebSocketUrl()),
    reconnectDelay: 5000,
  });
}
