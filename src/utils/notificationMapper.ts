import type {
  Notification,
  WebNotificationEvent,
} from '@/types/notification';

export function mapWebNotificationToNotification(
  event: WebNotificationEvent,
): Notification {
  return {
    // wire에 id가 없어 createdAtMs를 식별자로 쓴다(읽음 토글·React key용).
    id: event.createdAtMs,
    title: event.title,
    message: event.body,
    link: event.link ? event.link : undefined,
    createdAt: new Date(event.createdAtMs).toISOString(),
    read: false,
  };
}
