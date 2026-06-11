export type ChatRoomCategory = 'CRYPTO_CURRENCY';

export type PopularChatRoom = {
  id: number;
  title: string;
  description: string;
  popularity: number;
  memberCnt: number;
  hostId: number;
  createdAt: string;
};

export type PopularChatRoomResponse = {
  items: PopularChatRoom[];
  hasNext: boolean;
};

export type PopularChatRoomCursor = {
  lastId?: number;
  lastPopularity?: number;
};

export type MyChatRoom = {
  id: number;
  hostId: number;
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
  lastId?: number;
};