import type { Client } from '@stomp/stompjs';
import type { MyChatRoomBadgeEvent } from '@/types/chatRoom';
import type { ChatMessageAck, ChatMessageBroadcastEvent, ChatMessageRequest } from '@/types/chatMessage';

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

export function subscribeChatRoomMessages(
  client: Client,
  roomId: number,
  onMessage: (event: ChatMessageBroadcastEvent) => void,
) {
  return client.subscribe(`/topic/chat/${roomId}`, (message) => {
    const event = JSON.parse(message.body) as ChatMessageBroadcastEvent;
    onMessage(event);
  });
}

export function sendChatMessage(client: Client, request: ChatMessageRequest) {
  client.publish({
    destination: CHAT_MESSAGE_SEND_DESTINATION,
    body: JSON.stringify(request),
  });
}