import { Client, type StompHeaders } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken } from '@/utils/authStorage';

const STOMP_ENDPOINT = `${GATEWAY_URL}/ws`;

export function createStompClient() {
  const accessToken = getAccessToken();

  const connectHeaders: StompHeaders = {};

  if (accessToken) {
    connectHeaders.Authorization = `Bearer ${accessToken}`;
  }

  return new Client({
    webSocketFactory: () => new SockJS(STOMP_ENDPOINT),
    connectHeaders,
    reconnectDelay: 5000,
  });
}