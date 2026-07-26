import type {
  Notification,
  NotificationResponse,
  WebNotificationEvent,
} from '@/types/notification';

export function mapWebNotificationToNotification(
  event: WebNotificationEvent,
): Notification {
  return {
    // wire에 id가 없어 createdAtMs 기반 문자열을 식별자로 쓴다(읽음 토글·React key용).
    // REST 항목 id(notificationId)와 id 공간이 겹치지 않도록 stomp- 접두사를 붙인다.
    id: `stomp-${event.createdAtMs}`,
    title: event.title,
    message: event.body,
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
