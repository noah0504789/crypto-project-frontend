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

// 백엔드 PriceAlertData. 가격 알림의 탐지 원본이며 type이 'PRICE_ALERT'일 때 채워진다.
export type PriceAlertData = {
  code: string;
  price: number;
  avgPrice: number;
  avgInterval: number;
  changeRate: number;
  threshold: string;
  occurredAtMs: number;
};

// 백엔드 StompWebNotificationPayload. 구독 destination: /user/queue/notification
// title/body는 서버가 표시용으로 완성해 보낸다. data는 화면이 직접 조합할 때 쓰는 원본이다.
type WebNotificationBase = {
  notificationId: string;
  title: string;
  body: string;
  createdAtMs: number;
  link: string | null;
  messageParts: NotificationMessagePartResponse[];
};

// type을 판별자로 쓰는 유니온. 알림 종류가 늘면 여기에 갈래를 추가한다.
export type WebNotificationEvent =
  | (WebNotificationBase & { type: 'PRICE_ALERT'; data: PriceAlertData })
  | (WebNotificationBase & { type: 'SYSTEM'; data: null });

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
