import { apiClient } from '@/apis/apiClient';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken } from '@/utils/authStorage';
import type {
  ChatRoomDetailResponse,
  CreateChatRoomRequest,
  MyChatRoom,
  PopularChatRoomCursor,
  PopularChatRoomResponse,
  UpdateChatRoomRequest,
  MyChatRoomCursor,
  MyChatRoomResponse,
} from '@/types/chatRoom';

const pendingActivityReports = new Set<Promise<void>>();
const ACTIVITY_REPORT_MAX_WAIT_MS = 1500;

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
  lastRoomId,
  lastPopularity,
}: GetPopularChatRoomsParams) {
  const response = await apiClient.get<PopularChatRoomResponse>(
    '/chat/rooms/popular',
    {
      params: {
        limit,
        category,
        lastRoomId,
        lastPopularity,
      },
    },
  );

  return response.data;
}

export async function getMyChatRooms({
  limit,
  lastUnreadFlag,
  lastMsgCreatedAtMs,
  lastRoomId,
}: GetMyChatRoomsParams) {
  const response = await apiClient.get<MyChatRoomResponse>('/chat/rooms/me', {
    params: {
      limit,
      lastUnreadFlag,
      lastMsgCreatedAtMs,
      lastRoomId,
    },
  });

  return response.data;
}

export async function getChatRoom(roomId: string) {
  const response = await apiClient.get<ChatRoomDetailResponse>(
    `/chat/room/${roomId}`,
  );

  return response.data;
}

// 내 채팅방 단건(GET /chat/room/{roomId}/me). 배지 이벤트 방이 목록에 없을 때 prepend용.
export async function getMyChatRoom(roomId: string) {
  const response = await apiClient.get<MyChatRoom>(`/chat/room/${roomId}/me`);

  return response.data;
}

export async function createChatRoom(request: CreateChatRoomRequest) {
  await apiClient.post('/chat/room', request);
}

export async function updateChatRoom(
  roomId: string,
  request: UpdateChatRoomRequest,
) {
  await apiClient.patch(`/chat/room/${roomId}`, request);
}

// 방 입장 시 멤버십 등록(POST /chat/room/{roomId}/members). 멱등(신규 201, 기존 204).
// 백엔드 memberIds에 등록돼야 메시지 전송(gRPC save) 시 validateWritable을 통과한다.
export async function joinChatRoom(roomId: string) {
  await apiClient.post(`/chat/room/${roomId}/members`);
}

export async function leaveChatRoom(roomId: string) {
  await apiClient.delete(`/chat/room/${roomId}/members`);
}

// 읽음 위치 보고(PUT /chat/room/{roomId}/activity).
// beforeunload/언마운트에서 유실 방지를 위해 apiClient(axios) 대신 keepalive fetch + 수동 Authorization을 쓴다.
// 백엔드 파라미터명은 lastMsgReadSeq / lastMsgCreatedAtMs.
export function reportActivity({
  roomId,
  lastMsgReadSeq,
  lastMsgCreatedAtMs,
}: {
  roomId: string;
  lastMsgReadSeq: number;
  lastMsgCreatedAtMs: number;
}) {
  const accessToken = getAccessToken();

  const query = new URLSearchParams({
    lastMsgReadSeq: String(lastMsgReadSeq),
    lastMsgCreatedAtMs: String(lastMsgCreatedAtMs),
  });

  const request = fetch(
    `${GATEWAY_URL}/chat/room/${roomId}/activity?${query.toString()}`,
    {
      method: 'PUT',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: 'include',
      keepalive: true,
    },
  )
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      pendingActivityReports.delete(request);
    });

  pendingActivityReports.add(request);

  return request;
}

export async function waitForPendingActivityReports() {
  const reports = [...pendingActivityReports];

  if (reports.length === 0) {
    return;
  }

  await Promise.race([
    Promise.allSettled(reports),
    new Promise<void>((resolve) => {
      setTimeout(resolve, ACTIVITY_REPORT_MAX_WAIT_MS);
    }),
  ]);
}
