import type { Client } from '@stomp/stompjs';
import type { WebNotificationEvent } from '@/types/notification';

// 백엔드가 convertAndSendToUser(receiverId, '/queue/notification', ...)로 보내므로
// 클라이언트는 user-destination '/user/queue/notification'을 구독한다.
const WEB_NOTIFICATION_DESTINATION = '/user/queue/notification';

export function subscribeWebNotifications(
  client: Client,
  onMessage: (event: WebNotificationEvent) => void,
) {
  return client.subscribe(WEB_NOTIFICATION_DESTINATION, (message) => {
    const event = JSON.parse(message.body) as WebNotificationEvent;
    onMessage(event);
  });
}
