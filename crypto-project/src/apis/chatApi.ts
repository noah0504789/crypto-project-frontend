import { apiClient } from '@/apis/apiClient';
import type {
  PopularChatRoomCursor,
  PopularChatRoomResponse,
} from '@/types/chatRoom';

type GetPopularChatRoomsParams = PopularChatRoomCursor & {
  limit: number;
  category: string;
};

export async function getPopularChatRooms({
  limit,
  category,
  lastId,
  lastPopularity,
}: GetPopularChatRoomsParams) {
  const response = await apiClient.get<PopularChatRoomResponse>(
    '/chat/rooms/popular',
    {
      params: {
        limit,
        category,
        lastId,
        lastPopularity,
      },
    },
  );

  return response.data;
}