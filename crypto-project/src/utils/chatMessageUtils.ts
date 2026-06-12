import type {
  ChatMessage,
  ChatMessageBroadcastEvent,
} from '@/types/chatMessage';

export function createClientMessageId() {
  return `client-${Date.now()}-${crypto.randomUUID()}`;
}

export function mapBroadcastEventToChatMessage(
  event: ChatMessageBroadcastEvent,
): ChatMessage {
  return {
    id: Number(event.payload.id),
    roomId: Number(event.payload.roomId),
    writerId: Number(event.payload.writerId),
    writerName: `사용자 ${event.payload.writerId}`,
    content: event.payload.content,
    createdAt: event.payload.createdAt,
    status: 'sent',
  };
}

export function createChatMessage({
  roomId,
  writerId,
  writerName,
  content,
  status = 'pending',
}: {
  roomId: number;
  writerId: number;
  writerName: string;
  content: string;
  status?: ChatMessage['status'];
}): ChatMessage {
  return {
    id: Date.now(),
    roomId,
    writerId,
    writerName,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

export function isValidRoomId(roomId: number) {
  return !Number.isNaN(roomId);
}

export function getAvatarText(name: string) {
  return name.slice(0, 2).toUpperCase();
}