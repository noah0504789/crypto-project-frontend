export type NotificationMessagePart = {
  text: string;
  bold?: boolean;
  lineBreakAfter?: boolean;
};

export type Notification = {
  id: number;
  title: string;
  message: string;
  messageParts?: NotificationMessagePart[];
  link?: string;
  createdAt: string;
  read: boolean;
};

// 백엔드 StompWebNotificationPayload. 구독 destination: /user/topic/notification/
// title/body는 서버가 표시용으로 완성해 보낸다. data는 부가 정보(현재 미사용).
export type WebNotificationEvent = {
  type: string;
  title: string;
  body: string;
  createdAtMs: number;
  link: string | null;
  data?: Record<string, unknown>;
};