import type {
  Notification,
  NotificationResponse,
  WebNotificationEvent,
} from '@/types/notification';

export function mapWebNotificationToNotification(
  event: WebNotificationEvent,
): Notification {
  return {
    id: event.notificationId,
    title: event.title,
    message: event.body,
    messageParts:
      event.messageParts?.length > 0
        ? event.messageParts.map((part) => ({
            text: part.text,
            bold: part.bold,
            lineBreakAfter: part.lineBreakAfter,
          }))
        : undefined,
    link: event.link ? event.link : undefined,
    createdAt: new Date(event.createdAtMs).toISOString(),
    read: false,
  };
}

export function mapNotificationResponseToNotification(
  response: NotificationResponse,
): Notification {
  return {
    id: response.id,
    title: response.title,
    message: response.message,
    messageParts:
      response.messageParts.length > 0
        ? response.messageParts.map((part) => ({
            text: part.text,
            bold: part.bold,
            lineBreakAfter: part.lineBreakAfter,
          }))
        : undefined,
    link: response.link ? response.link : undefined,
    // 표시 시각은 전달 시각(deliveredAtMs) 기준. 목록 정렬 키와 일치하고 타임존 안전(epoch→ISO).
    createdAt:
      response.deliveredAtMs != null
        ? new Date(response.deliveredAtMs).toISOString()
        : (response.createdAt ?? ''),
    read: response.read,
    // 커서용(다음 페이지 요청에 되돌려 보냄)
    recipientId: response.recipientId,
    deliveredAtMs: response.deliveredAtMs ?? undefined,
  };
}
