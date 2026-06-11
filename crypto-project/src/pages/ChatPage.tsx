import { useState } from 'react';
import type { User } from '@/types/user';
import type { PopularChatRoom } from '@/types/chatRoom';
import './ChatPage.css';

type ChatPageProps = {
  user: User | null;
};

const mockPopularChatRooms: PopularChatRoom[] = [
  {
    id: 1,
    title: '비트코인 단기 시황방',
    description: 'BTC 단기 흐름과 주요 지지/저항을 이야기하는 방입니다.',
    popularity: 982,
    memberCnt: 128,
    hostId: 10,
    createdAt: '2026-06-11T09:00:00',
  },
  {
    id: 2,
    title: '이더리움 장기 투자방',
    description: 'ETH 장기 관점, 생태계 뉴스, ETF 이슈를 공유합니다.',
    popularity: 741,
    memberCnt: 86,
    hostId: 12,
    createdAt: '2026-06-10T20:30:00',
  },
  {
    id: 3,
    title: '알트코인 관찰방',
    description: '알트코인 급등락, 거래량, 테마 코인을 함께 봅니다.',
    popularity: 523,
    memberCnt: 64,
    hostId: 15,
    createdAt: '2026-06-09T18:10:00',
  },
];

export default function ChatPage({ user }: ChatPageProps) {
  const [popularChatRooms] = useState<PopularChatRoom[]>(mockPopularChatRooms);

  const isLoggedIn = user !== null;

  return (
    <section className="chat-page">
      <div className="chat-page-header">
        <div>
          <h1>인기 채팅방</h1>
          <p className="chat-page-description">
            지금 많이 참여하는 가상화폐 오픈채팅방을 확인해보세요.
          </p>
        </div>

        {isLoggedIn && (
          <div className="chat-page-actions">
            <button type="button" className="my-chat-button">
              내 채팅방
            </button>

            <button type="button" className="create-chat-room-button">
              채팅방 생성
            </button>
          </div>
        )}
      </div>

      <div className="popular-chat-room-list">
        {popularChatRooms.map((room) => (
          <article key={room.id} className="popular-chat-room-card">
            <div className="popular-chat-room-main">
              <div className="popular-chat-room-title-row">
                <h2>{room.title}</h2>
                <span className="popular-chat-room-badge">
                  인기 {room.popularity}
                </span>
              </div>

              <p className="popular-chat-room-description">
                {room.description}
              </p>

              <div className="popular-chat-room-meta">
                <span>멤버 {room.memberCnt}명</span>
                <span>방장 #{room.hostId}</span>
                <span>{new Date(room.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {isLoggedIn && (
              <button type="button" className="popular-chat-room-enter-button">
                입장하기
              </button>
            )}
          </article>
        ))}
      </div>

      <button type="button" className="popular-chat-room-more-button">
        더 보기
      </button>
    </section>
  );
}