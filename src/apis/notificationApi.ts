import { apiClient } from '@/apis/apiClient';
import type {
  NotificationCursor,
  NotificationsResponse,
} from '@/types/notification';

export const NOTIFICATION_LIMIT = 10;

type GetMyNotificationsParams = Partial<NotificationCursor> & {
  limit?: number;
};

// GET /notifications/me — 내 알림함(커서 페이지네이션). X-User-Id는 apiClient가 붙이는 Bearer로 서버가 판단.
// 커서(lastRecipientId/lastDeliveredAtMs)가 없으면 첫 페이지(최신순). axios가 undefined 파라미터는 생략한다.
export async function getMyNotifications({
  limit = NOTIFICATION_LIMIT,
  lastRecipientId,
  lastDeliveredAtMs,
}: GetMyNotificationsParams = {}) {
  const response = await apiClient.get<NotificationsResponse>(
    '/notifications/me',
    {
      params: {
        limit,
        lastRecipientId,
        lastDeliveredAtMs,
      },
    },
  );

  return response.data;
}

export async function markNotificationAsRead(notificationId: string) {
  await apiClient.patch(`/notifications/${notificationId}/read`);
}
