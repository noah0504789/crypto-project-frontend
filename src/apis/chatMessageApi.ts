import { apiClient } from '@/apis/apiClient';
import type {
  ChatMessageCursor,
  ChatMessagesResponse,
} from '@/types/chatMessage';

type GetChatMessagesParams = ChatMessageCursor & {
  roomId: number;
  limit: number;
};

export async function getChatMessages({
  roomId,
  limit,
  lastId,
  lastCreatedAtMillis,
}: GetChatMessagesParams) {
  const response = await apiClient.get<ChatMessagesResponse>(
    `/chat/room/${roomId}/messages`,
    {
      params: {
        limit,
        lastId,
        lastCreatedAtMillis,
      },
    },
  );

  return response.data;
}