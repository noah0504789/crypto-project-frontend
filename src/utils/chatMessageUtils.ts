import type { ChatMessage, ChatMessageBroadcastEvent, ChatMessageResponseItem } from '@/types/chatMessage';

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
  writerId: string;
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

export function mapChatMessageResponseItemToChatMessage(
  item: ChatMessageResponseItem,
): ChatMessage {
  return {
    id: item.id,
    roomId: item.roomId,
    writerId: item.writerId,
    writerName: item.writerName,
    content: item.content,
    createdAt: item.createdAt,
    status: 'sent',
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
    id: Number(event.messageId),
    roomId: Number(event.roomId),
    writerId: String(event.writerId),
    writerName: fallbackWriterName,
    content: event.content,
    createdAt: event.timestamp
      ? new Date(event.timestamp).toISOString()
      : new Date().toISOString(),
    status: 'sent',
    clientMessageId: event.clientMessageId,
  };
}

export function getAvatarText(name: string) {
  return name.slice(0, 2).toUpperCase();
}