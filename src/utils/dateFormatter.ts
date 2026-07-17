function getKoreanDateKey(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

function getKoreanYear(value: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
  }).format(value);
}

export function formatKoreanDateTime(value: string | number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatKoreanTime(value: string | number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatKoreanChatTime(value: string | number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const now = new Date();

  const todayKey = getKoreanDateKey(now);
  const messageDateKey = getKoreanDateKey(date);

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const yesterdayKey = getKoreanDateKey(yesterday);

  const timeText = formatKoreanTime(value);

  if (messageDateKey === todayKey) {
    return timeText;
  }

  if (messageDateKey === yesterdayKey) {
    return `어제 ${timeText}`;
  }

  const currentYear = getKoreanYear(now);
  const messageYear = getKoreanYear(date);

  if (messageYear === currentYear) {
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  }

  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}