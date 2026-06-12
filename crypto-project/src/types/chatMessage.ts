export type ChatMessageStatus = 'sent' | 'pending' | 'failed';

export type ChatMessage = {
  id: number;
  roomId: number;
  writerId: number;
  writerName: string;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
};

export type ChatMessageRequest = {
  roomId: string;
  writerId: string;
  content: string;
  clientMessageId: string;
};

export type ChatMessageBroadcastPayload = {
  id: string;
  roomId: string;
  writerId: string;
  content: string;
  createdAt: string;
};

export type ChatMessageBroadcastEvent = {
  payload: ChatMessageBroadcastPayload;
  memberIds: string[];
  clientMessageId: string;
};

export type ChatMessageAck = {
  id?: string;
  clientMessageId: string;
  success: boolean;
  ts?: string;
  code?: string;
};