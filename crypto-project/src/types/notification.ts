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

export type UpbitTickerAlertEvent = {
  code: string;
  price: number;
  timestamp: number;
  avgInterval: number;
  avgPrice: number;
  changeRate: number;
};