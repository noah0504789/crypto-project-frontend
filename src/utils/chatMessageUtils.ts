import type { ChatMessage, ChatMessageBroadcastEvent, ChatMessageResponseItem } from '@/types/chatMessage';

export function createClientMessageId() {
  return `client-${Date.now()}-${crypto.randomUUID()}`;
}

export function isValidRoomId(roomId: string) {
  return roomId.trim().length > 0;
}

export function createPendingChatMessage({
  roomId,
  writerId,
  writerName,
  content,
  clientMessageId,
}: {
  roomId: string;
  writerId: string;
  writerName: string;
  content: string;
  clientMessageId: string;
}): ChatMessage {
  return {
    id: String(Date.now()),
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
    id: event.messageId,
    roomId: event.roomId,
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