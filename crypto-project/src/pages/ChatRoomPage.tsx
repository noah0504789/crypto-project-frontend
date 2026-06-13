import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Client } from '@stomp/stompjs';
import { sendChatMessage, subscribeChatMessageAck, subscribeChatRoomMessages } from '@/apis/chatStompApi';
import { createStompClient } from '@/apis/stompClient';
import type { ChatMessage } from '@/types/chatMessage';
import type { User } from '@/types/user';
import { formatKoreanChatTime } from '@/utils/dateFormatter';
import { createClientMessageId, createPendingChatMessage, isValidRoomId, mapBroadcastEventToChatMessage, getAvatarText } from '@/utils/chatMessageUtils';
import LoadingButton from '@/components/Button/LoadingButton';

import './ChatRoomPage.css';

type ChatRoomPageProps = {
  user: User | null;
};

const roomTitle = '비트코인 단기 시황방';
const mockChatMessages: ChatMessage[] = [
  {
    id: 1,
    roomId: 101,
    writerId: 2,
    writerName: "coinWatcher",
    content: "오늘 비트코인 거래량이 꽤 올라왔네요.",
    createdAt: "2026-06-11T10:10:00",
    status: "sent",
  },
  {
    id: 2,
    roomId: 101,
    writerId: 1,
    writerName: "나",
    content: "108K 부근 저항 확인하고 들어가는 게 좋아 보입니다.",
    createdAt: "2026-06-11T10:12:00",
    status: "sent",
  },
  {
    id: 3,
    roomId: 101,
    writerId: 3,
    writerName: "ethLong",
    content:
      "알트는 아직 비트 방향성 확인하고 보는 게 안전할 것 같아요. 특히 거래량 없는 종목은 조심해야 할 듯합니다.",
    createdAt: "2026-06-11T10:15:00",
    status: "sent",
  },
  {
    id: 4,
    roomId: 101,
    writerId: 1,
    writerName: "나",
    content: "오케이. 일단 관망하면서 눌림목만 보겠습니다.",
    createdAt: "2026-06-11T10:18:00",
    status: "failed",
  },
];

export default function ChatRoomPage({ user }: ChatRoomPageProps) {
  const [searchParams] = useSearchParams();

  const roomIdParam = searchParams.get('roomId');
  const roomId = roomIdParam ? Number(roomIdParam) : NaN;

  const stompClientRef = useRef<Client | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(mockChatMessages);
  const [messageInput, setMessageInput] = useState('');
  const [isConnected, setIsConnected] = useState(false);

  const isLoggedIn = user !== null;
  const isInvalidRoomId = !isValidRoomId(roomId);

  const hasPendingMessage = messages.some(
    (message) => message.status === 'pending',
  );

  const canSend = isLoggedIn && !isInvalidRoomId && isConnected && messageInput.trim().length > 0 && !hasPendingMessage;

  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId || !user) {
      return;
    }

    const client = createStompClient();

    stompClientRef.current = client;

    client.onConnect = () => {
      setIsConnected(true);

      subscribeChatRoomMessages(client, roomId, (event) => {
        const writerId = Number(event.payload.writerId);

        const fallbackWriterName =
          writerId === user.id ? user.name : `사용자 ${event.payload.writerId}`;

        const receivedMessage = mapBroadcastEventToChatMessage({
          event,
          fallbackWriterName,
        });

        setMessages((prevMessages) => {
          const matchedMessageIndex = prevMessages.findIndex(
            (message) =>
              message.clientMessageId !== undefined &&
              message.clientMessageId === event.clientMessageId,
          );

          if (matchedMessageIndex === -1) {
            return [...prevMessages, receivedMessage];
          }

          return prevMessages.map((message, index) => {
            if (index !== matchedMessageIndex) {
              return message;
            }

            return {
              ...receivedMessage,
              writerName: message.writerName,
            };
          });
        });
      });

      subscribeChatMessageAck(client, (ack) => {
        if (ack.success) {
          return;
        }

        setMessages((prevMessages) =>
          prevMessages.map((message) => {
            if (message.clientMessageId !== ack.clientMessageId) {
              return message;
            }

            return {
              ...message,
              status: 'failed',
            };
          }),
        );
      });
    };

    client.onWebSocketClose = () => {
      setIsConnected(false);
    };

    client.onStompError = () => {
      setIsConnected(false);
    };

    client.activate();

    return () => {
      stompClientRef.current = null;
      setIsConnected(false);
      void client.deactivate();
    };
  }, [isLoggedIn, isInvalidRoomId, roomId, user]);

  function publishMessage({
    content,
    clientMessageId,
  }: {
    content: string;
    clientMessageId: string;
  }) {
    const client = stompClientRef.current;

    if (!client || !client.connected || !user) {
      return false;
    }

    sendChatMessage(client, {
      roomId: String(roomId),
      writerId: String(user.id),
      content,
      clientMessageId,
    });

    return true;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSend || !user) {
      return;
    }

    const content = messageInput.trim();
    const clientMessageId = createClientMessageId();

    const pendingMessage = createPendingChatMessage({
      roomId,
      writerId: user.id,
      writerName: user.name,
      content,
      clientMessageId,
    });

    setMessages((prevMessages) => [...prevMessages, pendingMessage]);
    setMessageInput('');

    const isPublished = publishMessage({
      content,
      clientMessageId,
    });

    if (!isPublished) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.clientMessageId !== clientMessageId) {
            return message;
          }

          return {
            ...message,
            status: 'failed',
          };
        }),
      );
    }
  }

  function handleRetryMessage(messageId: number) {
    const failedMessage = messages.find((message) => message.id === messageId);

    if (!failedMessage || !user) {
      return;
    }

    const nextClientMessageId = createClientMessageId();

    setMessages((prevMessages) =>
      prevMessages.map((message) => {
        if (message.id !== messageId) {
          return message;
        }

        return {
          ...message,
          status: 'pending',
          createdAt: new Date().toISOString(),
          clientMessageId: nextClientMessageId,
        };
      }),
    );

    const isPublished = publishMessage({
      content: failedMessage.content,
      clientMessageId: nextClientMessageId,
    });

    if (!isPublished) {
      setMessages((prevMessages) =>
        prevMessages.map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          return {
            ...message,
            status: 'failed',
          };
        }),
      );
    }
  }

  if (!isLoggedIn) {
    return (
      <section className="chat-room-page">
        <div className="chat-room-empty-card">
          채팅방 입장은 로그인 후 사용할 수 있습니다.
        </div>
      </section>
    );
  }

  if (isInvalidRoomId) {
    return (
      <section className="chat-room-page">
        <div className="chat-room-empty-card">
          입장할 채팅방 정보가 없습니다.

          <Link to="/chat" className="chat-room-empty-link">
            인기 채팅방으로 이동
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="chat-room-page">
      <div className="chat-room-shell">
        <div className="chat-room-header">
          <div>
            <h1>{roomTitle}</h1>
          </div>

          <span
            className={`chat-room-connection-dot ${
              isConnected ? 'connected' : 'disconnected'
            }`}
          />
        </div>

        <div className="chat-room-box">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isMine = user.id === message.writerId;

              return (
                <div
                  key={`${message.id}-${message.clientMessageId ?? message.createdAt}`}
                  className={`chat-message-row ${isMine ? 'me' : 'other'}`}
                >
                  {!isMine && (
                    <div className="chat-message-side">
                      <div className="chat-message-avatar">
                        {getAvatarText(message.writerName)}
                      </div>

                      <span className="chat-message-name">
                        {message.writerName}
                      </span>
                    </div>
                  )}

                  <div
                    className={`chat-message-bubble ${isMine ? 'me' : 'other'} ${
                      isMine ? message.status : 'sent'
                    }`}
                  >
                    <div className="chat-message-content">
                      {message.content}
                    </div>

                    <div className="chat-message-meta">
                      {isMine && message.status === 'pending' && (
                        <span className="chat-message-status">전송 중</span>
                      )}

                      {isMine && message.status === 'failed' && (
                        <>
                          <span>
                            {formatKoreanChatTime(message.createdAt)}
                          </span>

                          <button
                            type="button"
                            className="chat-message-retry-button"
                            onClick={() => handleRetryMessage(message.id)}
                            aria-label="재전송"
                          >
                            ↻
                          </button>
                        </>
                      )}

                      {(!isMine || message.status === 'sent') && (
                        <span>{formatKoreanChatTime(message.createdAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="chat-room-empty-card">
              <p>
                {isConnected
                  ? '아직 메시지가 없습니다.'
                  : '채팅 서버에 연결 중입니다.'}
              </p>
            </div>
          )}
        </div>

        <form className="chat-room-input-area" onSubmit={handleSubmit}>
          <input
            type="text"
            value={messageInput}
            placeholder={
              isConnected
                ? '메시지를 입력하세요.'
                : '채팅 서버에 연결 중입니다. 잠시 후 다시 시도해주세요.'
            }
            onChange={(event) => setMessageInput(event.target.value)}
            disabled={!isConnected}
          />

          <LoadingButton
            type="submit"
            className="chat-room-send-button"
            isLoading={hasPendingMessage}
            loadingText="전송 중..."
            disabled={!canSend}
          >
            전송
          </LoadingButton>
        </form>
      </div>
    </section>
  );
}