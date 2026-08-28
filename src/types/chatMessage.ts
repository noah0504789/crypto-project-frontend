export type ChatMessageStatus = 'sent' | 'pending' | 'failed';

export type ChatMessage = {
  id: string;
  roomId: string;
  writerId: string;
  writerName?: string;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  clientMessageId?: string;
};

export type ChatMessageResponseItem = {
  id: string;
  roomId: string;
  writerId: string;
  writerName?: string;
  content: string;
  createdAt: string;
};

export type ChatMessagesResponse = {
  items: ChatMessageResponseItem[];
  hasNext: boolean;
};

export type ChatMessageCursor = {
  lastMsgId?: string;
  lastCreatedAtMs?: number;
};

export type ChatMessageRequest = {
  roomId: string;
  writerId: string;
  content: string;
  clientMessageId: string;
};

// 백엔드가 /topic/chat/{roomId}로 보내는 flat wire payload(StompChatMessagePayload).
// timestamp는 epoch millis(숫자), 시간 없음이면 0.
export type ChatMessageBroadcastEvent = {
  messageId: string;
  roomId: string;
  writerId: string;
  content: string;
  timestamp: number;
  clientMessageId: string;
};

// 게이트웨이가 같은 방의 메시지를 시간창(100ms)으로 묶어 보내는 봉투(StompChatMessageBatchPayload).
// roomId를 메시지마다 반복하지 않으므로 봉투에 한 번만 둔다.
// messages 순서가 곧 서버가 받은 순서다.
export type ChatMessageBatchEvent = {
  roomId: string;
  messages: ChatMessageBroadcastEvent[];
};

export type ChatMessageAck = {
  id?: string;
  clientMessageId: string;
  success: boolean;
  ts?: string;
  code?: string;
};
