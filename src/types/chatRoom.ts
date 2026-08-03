export const CHAT_ROOM_CATEGORIES = ['CRYPTO_CURRENCY'] as const;

export type ChatRoomCategory = (typeof CHAT_ROOM_CATEGORIES)[number];

export type PopularChatRoom = {
  id: string;
  title: string;
  description: string;
  popularity: number;
  memberCnt: number;
  hostId: string;
  createdAt: string;
};

export type PopularChatRoomResponse = {
  items: PopularChatRoom[];
  hasNext: boolean;
};

export type PopularChatRoomCursor = {
  lastId?: string;
  lastPopularity?: number;
};

// GET /chat/room/{roomId} 방 상세(백엔드 ChatRoomResponse). id는 문자열, msgCnt는 최신 시퀀스.
export type ChatRoomDetailResponse = {
  id: string;
  hostId: string;
  title: string;
  description: string;
  category: ChatRoomCategory;
  msgCnt: number;
  memberCnt: number;
  popularity: number;
  createdAt: string;
};

export type MyChatRoom = {
  id: string;
  hostId: string;
  title: string;
  category: ChatRoomCategory;
  description: string;
  lastMsgContent: string | null;
  lastMsgCreatedAt: string | null;
  unreadMsgCnt: number;
  memberCnt: number;
};

export type MyChatRoomResponse = {
  items: MyChatRoom[];
  hasNext: boolean;
};

export type MyChatRoomCursor = {
  lastUnreadFlag?: boolean;
  lastMsgCreatedAt?: string | null;
  lastId?: string;
};

export type CreateChatRoomRequest = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

export type UpdateChatRoomRequest = {
  title: string;
  description: string;
  category: ChatRoomCategory;
};

// STOMP /user/queue/chat/badge 수신 payload(백엔드 StompMyChatRoomBadgePayload).
// convertAndSendToUser로 멤버별 전송되므로 flat이며 memberIds는 없다.
export type MyChatRoomBadgeEvent = {
  roomId: string;
  lastMsgContent: string;
  lastMsgCreatedAt: string;
};