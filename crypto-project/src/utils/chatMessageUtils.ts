import type { ChatMessage, ChatMessageBroadcastEvent } from '@/types/chatMessage';

export function createClientMessageId() {
  return `client-${Date.now()}-${crypto.randomUUID()}`;
}

export function isValidRoomId(roomId: number) {
  return !Number.isNaN(roomId) && roomId > 0;
}

export function createPendingChatMessage({
  roomId,
  writerId,
  writerName,
  content,
  clientMessageId,
}: {
  roomId: number;
  writerId: number;
  writerName: string;
  content: string;
  clientMessageId: string;
}): ChatMessage {
  return {
    id: Date.now(),
    roomId,
    writerId,
    writerName,
    content,
    createdAt: new Date().toISOString(),
    status: 'pending',
    clientMessageId,
  };
}

export function mapBroadcastEventToChatMessage({
  event,
  fallbackWriterName,
}: {
  event: ChatMessageBroadcastEvent;
  fallbackWriterName: string;
}): ChatMessage {
  return {
    id: Number(event.payload.id),
    roomId: Number(event.payload.roomId),
    writerId: Number(event.payload.writerId),
    writerName: fallbackWriterName,
    content: event.payload.content,
    createdAt: event.payload.createdAt,
    status: 'sent',
    clientMessageId: event.clientMessageId,
  };
}

export function getAvatarText(name: string) {
  return name.slice(0, 2).toUpperCase();
}
