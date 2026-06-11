import type {
  Notification,
  UpbitTickerAlertEvent,
} from '@/types/notification';

export function mapUpbitTickerAlertToNotification(
  event: UpbitTickerAlertEvent,
): Notification {
  const changeRatePercent = (event.changeRate * 100).toFixed(2);
  const price = event.price.toLocaleString();

  return {
    id: event.timestamp,
    title: `${event.code} 가격 변동 알림`,
    message: `${event.code} 가격이 ${changeRatePercent}% 변동했습니다. 현재가 ${price}원`,
    createdAt: new Date(event.timestamp).toISOString(),
    read: false,
    messageParts: [
      { text: event.code, bold: true },
      { text: ' 가격이 ' },
      { text: `${changeRatePercent}%`, bold: true },
      { text: ' 변동했습니다.', lineBreakAfter: true },
      { text: '현재가 ' },
      { text: `${price}원`, bold: true },
    ],
  };
}