import { GATEWAY_URL } from './config.js';
import { getAccessToken } from './auth-api.js';

const topics = new Map();
let client = null;

function ensureClient() {
  if (client) return client;

  client = new StompJs.Client({
    // webSocketFactory: () => new SockJS(`${GATEWAY_URL}/ws?access_token=${getAccessToken()}`, null, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
    webSocketFactory: () => new WebSocket(`${GATEWAY_URL.replace(/^http/, 'ws')}/ws-native?access_token=${getAccessToken()}`),
    reconnectDelay: 5000,
    debug: (message) => console.log(message),
    onConnect: () => {
      for (const [topic, entry] of topics) {
        if (!entry.handler || entry.sub) continue;
        entry.sub = client.subscribe(topic, (frame) => entry.handler(JSON.parse(frame.body)));
      }
    },
    onWebSocketClose: () => topics.forEach((entry) => { entry.sub = null; }),
  });

  window.addEventListener('beforeunload', () => client?.deactivate());
  return client;
}

function activateIfNeeded() {
  const currentClient = ensureClient();
  if (!currentClient.active && !currentClient.connected) currentClient.activate();
  return currentClient;
}

export const stompClient = {
  activate() {
    activateIfNeeded();
  },
  connected() {
    return !!client?.connected;
  },
  publish({ destination, body, headers = {} }) {
    const currentClient = activateIfNeeded();
    currentClient.publish({
      destination,
      headers: { 'content-type': 'application/json', ...headers },
      body,
    });
  },
  subscribe(topic, handler) {
    const currentClient = activateIfNeeded();

    let entry = topics.get(topic);
    if (!entry) topics.set(topic, entry = { sub: null, handler: null });

    entry.handler = handler;

    if (!currentClient.connected || entry.sub) return;
    entry.sub = currentClient.subscribe(topic, (frame) => entry.handler(JSON.parse(frame.body)));
  },
};

window.stompClient = stompClient;
