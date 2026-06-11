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