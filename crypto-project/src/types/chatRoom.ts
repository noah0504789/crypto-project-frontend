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