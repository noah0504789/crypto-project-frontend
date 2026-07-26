export type NotificationMessagePart = {
  text: string;
  bold?: boolean;
  lineBreakAfter?: boolean;
};

export type Notification = {
  id: string;
  title: string;
  message: string;
  messageParts?: NotificationMessagePart[];
  link?: string;
  createdAt: string;
  read: boolean;
  // 커서 페이지네이션용. REST(GET /notifications/me)로 불러온 항목만 채워지고,
  // STOMP 실시간 수신 항목에는 없다(백엔드 push 페이로드에 recipientId/deliveredAt가 없음).
  recipientId?: string;
  deliveredAtMs?: number;
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

// GET /notifications/me 응답 항목(백엔드 NotificationResponse).
// deliveredAt는 표시용 문자열, deliveredAtMs는 커서용 epoch millis(다음 페이지 요청에 그대로 되돌려 보냄).
export type NotificationMessagePartResponse = {
  text: string;
  bold: boolean;
  lineBreakAfter: boolean;
};

export type NotificationResponse = {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  messageParts: NotificationMessagePartResponse[];
  read: boolean;
  readAt: string | null;
  deliveredAt: string | null;
  deliveredAtMs: number | null;
  createdAt: string | null;
  link: string | null;
};

export type NotificationsResponse = {
  items: NotificationResponse[];
  hasNext: boolean;
};

// 커서: 현재 목록에서 가장 오래된(맨 아래) 항목 기준으로 다음 페이지를 조회한다.
export type NotificationCursor = {
  lastRecipientId: string;
  lastDeliveredAtMs: number;
};
