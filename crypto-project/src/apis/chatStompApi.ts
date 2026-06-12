import type { Client } from '@stomp/stompjs';
import type { MyChatRoomBadgeEvent } from '@/types/chatRoom';

const MY_CHAT_ROOM_BADGE_DESTINATION = '/user/queue/my-chat-room-badge';

export function subscribeMyChatRoomBadge(
  client: Client,
  onMessage: (event: MyChatRoomBadgeEvent) => void,
) {
  return client.subscribe(MY_CHAT_ROOM_BADGE_DESTINATION, (message) => {
    const event = JSON.parse(message.body) as MyChatRoomBadgeEvent;

    onMessage(event);
  });
}