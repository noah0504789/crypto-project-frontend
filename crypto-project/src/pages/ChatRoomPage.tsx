import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { User } from '@/types/user';
import type { ChatMessage } from '@/types/chatMessage';
import { formatKoreanChatTime } from '@/utils/dateFormatter';
import './ChatRoomPage.css';

type ChatRoomPageProps = {
  user: User | null;
};

const mockMessages: ChatMessage[] = [
  {
    id: 1,
    roomId: 101,
    writerId: 2,
    writerName: '민수',
    content: '오늘 BTC 흐름 괜찮아 보이네요.',
    createdAt: '2026-06-11T08:30:00.000Z',
    status: 'sent',
  },
  {
    id: 2,
    roomId: 101,
    writerId: 3,
    writerName: '지훈',
    content: '저항선은 145M 근처로 보고 있어요.',
    createdAt: '2026-06-11T08:34:00.000Z',
    status: 'sent',
  },
  {
    id: 3,
    roomId: 101,
    writerId: 1,
    writerName: 'noah',
    content: '일단 거래량 더 보고 들어가야겠네요.',
    createdAt: '2026-06-11T08:36:00.000Z',
    status: 'sent',
  },
];

export default function ChatRoomPage({ user }: ChatRoomPageProps) {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('roomId');

  const [messages, setMessages] = useState<ChatMessage[]>(mockMessages);
  const [messageInput, setMessageInput] = useState('');

  const isLoggedIn = user !== null;

  function handleChangeMessageInput(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    setMessageInput(event.target.value);
  }

  function handleSendMessage() {
    const content = messageInput.trim();

    if (!content) {
      return;
    }

    if (!user) {
      alert('로그인이 필요한 서비스입니다.');
      return;
    }

    if (!roomId) {
      alert('채팅방 ID가 없습니다.');
      return;
    }

    const nextMessage: ChatMessage = {
      id: Date.now(),
      roomId: Number(roomId),
      writerId: user.id,
      writerName: user.name,
      content,
      createdAt: new Date().toISOString(),
      status: 'sent',
    };

    setMessages((prevMessages) => [...prevMessages, nextMessage]);
    setMessageInput('');
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      handleSendMessage();
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="chat-room-page">
        <div className="chat-room-empty-card">
          <h1>채팅방</h1>
          <p>채팅방 입장은 로그인 후 사용할 수 있습니다.</p>

          <Link to="/chat" className="chat-room-empty-link">
            인기 채팅방으로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  if (!roomId) {
    return (
      <section className="chat-room-page">
        <div className="chat-room-empty-card">
          <h1>채팅방</h1>
          <p>채팅방 ID가 없습니다.</p>

          <Link to="/chat" className="chat-room-empty-link">
            인기 채팅방으로 돌아가기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-room-page">
      <div className="chat-room-shell">
        <header className="chat-room-header">
          <div>
            <span className="chat-room-eyebrow">단체 채팅</span>
            <h1>채팅방 #{roomId}</h1>
          </div>
        </header>

        <div className="chat-room-box" aria-label="채팅 메시지 목록">
          {messages.map((message) => {
            const isMine = message.writerId === user.id;

            return (
              <div
                key={message.id}
                className={`chat-message-row ${isMine ? 'me' : 'other'}`}
              >
                {!isMine && (
                  <div className="chat-message-side">
                    <div className="chat-message-name">
                      {message.writerName}
                    </div>
                    <div className="chat-message-avatar">
                      {message.writerName.charAt(0)}
                    </div>
                  </div>
                )}

                <div
                  className={`chat-message-bubble ${
                    isMine ? 'me' : 'other'
                  }`}
                >
                  <div className="chat-message-content">
                    {message.content}
                  </div>

                  <div className="chat-message-meta">
                    <span>{formatKoreanChatTime(message.createdAt)}</span>

                    {isMine && message.status === 'pending' && (
                      <span>전송 중</span>
                    )}

                    {isMine && message.status === 'failed' && (
                      <button type="button">재시도</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="chat-room-input-area">
          <input
            type="text"
            value={messageInput}
            placeholder="메시지를 입력하세요..."
            onChange={handleChangeMessageInput}
            onKeyDown={handleKeyDown}
          />

          <button type="button" onClick={handleSendMessage}>
            보내기
          </button>
        </div>
      </div>
    </section>
  );
}