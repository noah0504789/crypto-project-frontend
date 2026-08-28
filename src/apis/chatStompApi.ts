import type { Client } from '@stomp/stompjs';
import type { MyChatRoomBadgeEvent } from '@/types/chatRoom';
import type {
  ChatMessageAck,
  ChatMessageBatchEvent,
  ChatMessageBroadcastEvent,
  ChatMessageRequest,
} from '@/types/chatMessage';

const MY_CHAT_ROOM_BADGE_DESTINATION = '/user/queue/chat/badge';

const CHAT_MESSAGE_SEND_DESTINATION = '/msg/chat.send';
const CHAT_MESSAGE_ACK_DESTINATION = '/user/queue/chat/ack';

export function subscribeMyChatRoomBadge(
  client: Client,
  onMessage: (event: MyChatRoomBadgeEvent) => void,
) {
  return client.subscribe(MY_CHAT_ROOM_BADGE_DESTINATION, (message) => {
    const event = JSON.parse(message.body) as MyChatRoomBadgeEvent;
    onMessage(event);
  });
}

export function subscribeChatMessageAck(
  client: Client,
  onMessage: (ack: ChatMessageAck) => void,
) {
  return client.subscribe(CHAT_MESSAGE_ACK_DESTINATION, (message) => {
    const ack = JSON.parse(message.body) as ChatMessageAck;
    onMessage(ack);
  });
}

// 봉투와 단건을 모두 받는다. 백엔드와 프론트가 저장소가 달라 배포 순서를 맞출 수 없으므로,
// 어느 쪽이 먼저 나가도 깨지지 않게 두 모양을 함께 처리한다.
// 봉투 안의 순서가 서버가 받은 순서이므로 그대로 순회한다.
function toBroadcastEvents(body: string): ChatMessageBroadcastEvent[] {
  const parsed = JSON.parse(body) as ChatMessageBatchEvent | ChatMessageBroadcastEvent;

  if ('messages' in parsed && Array.isArray(parsed.messages)) {
    return parsed.messages;
  }

  return [parsed as ChatMessageBroadcastEvent];
}

export function subscribeChatRoomMessages(
  client: Client,
  roomId: string,
  onMessage: (event: ChatMessageBroadcastEvent) => void,
) {
  return client.subscribe(`/topic/chat/${roomId}`, (message) => {
    toBroadcastEvents(message.body).forEach(onMessage);
  });
}

export function sendChatMessage(client: Client, request: ChatMessageRequest) {
  client.publish({
    destination: CHAT_MESSAGE_SEND_DESTINATION,
    body: JSON.stringify(request),
  });
}