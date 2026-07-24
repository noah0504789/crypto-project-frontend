export type ChatMessageStatus = 'sent' | 'pending' | 'failed';

export type ChatMessage = {
  id: number;
  roomId: number;
  writerId: string;
  writerName?: string;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  clientMessageId?: string;
};

export type ChatMessageResponseItem = {
  id: number;
  roomId: number;
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
  lastId?: number;
  lastCreatedAtMillis?: number;
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

export type ChatMessageAck = {
  id?: string;
  clientMessageId: string;
  success: boolean;
  ts?: string;
  code?: string;
};