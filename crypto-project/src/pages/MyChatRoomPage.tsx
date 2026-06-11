import { useState } from 'react';
import type { User } from '@/types/user';
import type { MyChatRoom } from '@/types/chatRoom';
import './MyChatRoomPage.css';

type MyChatRoomsPageProps = {
  user: User | null;
};

const mockMyChatRooms: MyChatRoom[] = [
  {
    id: 101,
    hostId: 1,
    title: '비트코인 단기 시황방',
    category: 'CRYPTO_CURRENCY',
    description: 'BTC 단기 흐름과 주요 지지/저항을 이야기하는 방입니다.',
    lastMsgContent: '오늘 저항선은 108K 부근으로 보입니다.',
    lastMsgCreatedAt: '2026-06-11T10:10:00',
    unreadMsgCnt: 3,
    memberCnt: 128,
  },
  {
    id: 102,
    hostId: 12,
    title: '이더리움 장기 투자방',
    category: 'CRYPTO_CURRENCY',
    description: 'ETH 장기 관점과 생태계 뉴스를 공유합니다.',
    lastMsgContent: 'ETF 자금 유입 체크해볼게요.',
    lastMsgCreatedAt: '2026-06-11T09:40:00',
    unreadMsgCnt: 0,
    memberCnt: 86,
  },
  {
    id: 103,
    hostId: 1,
    title: '알트코인 관찰방',
    category: 'CRYPTO_CURRENCY',
    description: '거래량과 테마 중심으로 알트코인을 함께 봅니다.',
    lastMsgContent: null,
    lastMsgCreatedAt: null,
    unreadMsgCnt: 0,
    memberCnt: 64,
  },
];

function formatDateTime(value: string | null) {
  if (!value) return '최근 메시지 없음';

  return new Date(value).toLocaleString();
}

export default function MyChatRoomsPage({ user }: MyChatRoomsPageProps) {
  const [myChatRooms] = useState<MyChatRoom[]>(mockMyChatRooms);

  const isLoggedIn = user !== null;

  function handleEnterRoom(roomId: number) {
    // 나중에 react-router-dom navigate 또는 기존 stomp chat 화면으로 연결
    window.location.href = `/stomp-chat?roomId=${roomId}`;
  }

  function handleUpdateRoom(room: MyChatRoom) {
    const params = new URLSearchParams({
      roomId: String(room.id),
      title: room.title,
      description: room.description,
      category: room.category,
    });

    window.location.href = `/update-chat-room?${params.toString()}`;
  }

  function handleLeaveRoom(roomId: number) {
    // 나중에 DELETE /chat/room/{roomId}/members 연결
    console.log('leave room:', roomId);
  }

  if (!isLoggedIn) {
    return (
      <section className="my-chat-rooms-page">
        <div className="my-chat-rooms-empty-card">
          <h1>내 채팅방</h1>
          <p>내 채팅방 목록은 로그인 후 확인할 수 있습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="my-chat-rooms-page">
      <div className="my-chat-rooms-header">
        <div>
          <h1>내 채팅방</h1>
          <p className="my-chat-rooms-description">
            참여 중인 오픈채팅방과 읽지 않은 메시지를 확인해보세요.
          </p>
        </div>
      </div>

      <div className="my-chat-room-list">
        {myChatRooms.map((room) => {
          const isOwner = user.id === room.hostId;
          const hasUnread = room.unreadMsgCnt > 0;

          return (
            <article
              key={room.id}
              className={`my-chat-room-card ${hasUnread ? 'has-unread' : ''}`}
            >
              <div className="my-chat-room-main">
                <div className="my-chat-room-title-row">
                  <h2>{room.title}</h2>

                  {hasUnread && (
                    <span className="my-chat-room-unread-badge">
                      {room.unreadMsgCnt > 99 ? '99+' : room.unreadMsgCnt}
                    </span>
                  )}
                </div>

                <p className="my-chat-room-description">{room.description}</p>

                <div className="my-chat-room-last-message">
                  <strong>최근 메시지</strong>
                  <span>{room.lastMsgContent ?? '최근 메시지가 없습니다.'}</span>
                </div>

                <div className="my-chat-room-meta">
                  <span>ID {room.id}</span>
                  <span>멤버 {room.memberCnt}명</span>
                  <span>카테고리 {room.category}</span>
                  <span>{formatDateTime(room.lastMsgCreatedAt)}</span>
                </div>
              </div>

              <div className="my-chat-room-actions">
                <button
                  type="button"
                  className="my-chat-room-button primary"
                  onClick={() => handleEnterRoom(room.id)}
                >
                  입장하기
                </button>

                {isOwner && (
                  <button
                    type="button"
                    className="my-chat-room-button"
                    onClick={() => handleUpdateRoom(room)}
                  >
                    수정하기
                  </button>
                )}

                <button
                  type="button"
                  className="my-chat-room-button danger"
                  onClick={() => handleLeaveRoom(room.id)}
                >
                  나가기
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" className="my-chat-room-more-button">
        더 보기
      </button>
    </section>
  );
}