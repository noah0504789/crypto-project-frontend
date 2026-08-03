import { apiClient } from '@/apis/apiClient';
import type {
  ChatMessageCursor,
  ChatMessagesResponse,
} from '@/types/chatMessage';

type GetChatMessagesParams = ChatMessageCursor & {
  roomId: string;
  limit: number;
};

export async function getChatMessages({
  roomId,
  limit,
  lastMsgId,
  lastCreatedAtMs,
}: GetChatMessagesParams) {
  const response = await apiClient.get<ChatMessagesResponse>(
    `/chat/room/${roomId}/messages`,
    {
      params: {
        limit,
        lastMsgId,
        lastCreatedAtMs,
      },
    },
  );

  return response.data;
}
