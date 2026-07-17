import { apiClient } from '@/apis/apiClient';
import type {
  CreateChatRoomRequest,
  PopularChatRoomCursor,
  PopularChatRoomResponse,
  UpdateChatRoomRequest,
  MyChatRoomCursor,
  MyChatRoomResponse,
} from '@/types/chatRoom';

type GetPopularChatRoomsParams = PopularChatRoomCursor & {
  limit: number;
  category: string;
};

type GetMyChatRoomsParams = MyChatRoomCursor & {
  limit: number;
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

export async function getMyChatRooms({
  limit,
  lastUnreadFlag,
  lastMsgCreatedAt,
  lastId,
}: GetMyChatRoomsParams) {
  const response = await apiClient.get<MyChatRoomResponse>('/chat/rooms/me', {
    params: {
      limit,
      lastUnreadFlag,
      lastMsgCreatedAt,
      lastId,
    },
  });

  return response.data;
}

export async function createChatRoom(request: CreateChatRoomRequest) {
  await apiClient.post('/chat/room', request);
}

export async function updateChatRoom(
  roomId: number,
  request: UpdateChatRoomRequest,
) {
  await apiClient.put(`/chat/room/${roomId}`, request);
}

export async function leaveChatRoom(roomId: number) {
  await apiClient.delete(`/chat/room/${roomId}/members/me`);
}