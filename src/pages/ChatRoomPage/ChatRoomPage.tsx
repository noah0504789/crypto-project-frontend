import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Client } from "@stomp/stompjs";

import { getChatMessages } from "@/apis/chatMessageApi";
import {
  sendChatMessage,
  subscribeChatMessageAck,
  subscribeChatRoomMessages,
} from "@/apis/chatStompApi";
import { createStompClient } from "@/apis/stompClient";
import type { ChatMessage } from "@/types/chatMessage";
import type { User } from "@/types/user";
import {
  createClientMessageId,
  createPendingChatMessage,
  getAvatarText,
  isValidRoomId,
  mapBroadcastEventToChatMessage,
  mapChatMessageResponseItemToChatMessage,
} from "@/utils/chatMessageUtils";
import LoadingButton from "@/components/Button/LoadingButton";
import { formatKoreanChatTime } from "@/utils/dateFormatter";

import "./ChatRoomPage.css";

type ChatRoomPageProps = {
  user: User | null;
};

const roomTitle = "비트코인 단기 시황방";
const MESSAGE_LIMIT = 10;
const PREVIOUS_MESSAGE_SCROLL_THRESHOLD = 40;

export default function ChatRoomPage({ user }: ChatRoomPageProps) {
  const [searchParams] = useSearchParams();

  const roomIdParam = searchParams.get("roomId");
  const roomId = roomIdParam ? Number(roomIdParam) : NaN;

  const stompClientRef = useRef<Client | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] =
    useState(false);
  const [hasNextMessages, setHasNextMessages] = useState(false);

  const isLoggedIn = user !== null;
  const isInvalidRoomId = !isValidRoomId(roomId);

  const hasPendingMessage = messages.some(
    (message) => message.status === "pending",
  );

  const canSend =
    isLoggedIn &&
    !isInvalidRoomId &&
    isConnected &&
    messageInput.trim().length > 0 &&
    !hasPendingMessage;

  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId) {
      return;
    }

    let isCancelled = false;

    async function loadRecentMessages() {
      try {
        setIsLoadingMessages(true);

        const response = await getChatMessages({
          roomId,
          limit: MESSAGE_LIMIT,
        });

        if (isCancelled) {
          return;
        }

        const nextMessages = [...response.items]
          .reverse()
          .map(mapChatMessageResponseItemToChatMessage);

        setMessages(nextMessages);
        setHasNextMessages(response.hasNext);

        requestAnimationFrame(() => {
          const chatBox = chatBoxRef.current;

          if (!chatBox) {
            return;
          }

          chatBox.scrollTop = chatBox.scrollHeight;
        });
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          alert("최근 메시지를 불러오지 못했습니다.");
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadRecentMessages();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, isInvalidRoomId, roomId]);

  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId || !user) {
      return;
    }

    const client = createStompClient();

    stompClientRef.current = client;

    client.onConnect = () => {
      setIsConnected(true);

      subscribeChatRoomMessages(client, roomId, (event) => {
        const writerId = String(event.writerId);

        const fallbackWriterName =
          writerId === user.id
            ? user.nickname
            : `사용자 ${event.writerId}`;

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
            const alreadyExists = prevMessages.some(
              (message) => message.id === receivedMessage.id,
            );

            if (alreadyExists) {
              return prevMessages;
            }

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

        requestAnimationFrame(() => {
          const chatBox = chatBoxRef.current;

          if (!chatBox) {
            return;
          }

          const distanceFromBottom =
            chatBox.scrollHeight - chatBox.scrollTop - chatBox.clientHeight;

          if (distanceFromBottom < 120) {
            chatBox.scrollTop = chatBox.scrollHeight;
          }
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
              status: "failed",
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

  async function loadPreviousMessages() {
    if (
      !isLoggedIn ||
      isInvalidRoomId ||
      isLoadingMessages ||
      isLoadingPreviousMessages ||
      !hasNextMessages ||
      messages.length === 0
    ) {
      return;
    }

    const chatBox = chatBoxRef.current;
    const oldestMessage = messages[0];

    const previousScrollHeight = chatBox?.scrollHeight ?? 0;
    const previousScrollTop = chatBox?.scrollTop ?? 0;

    try {
      setIsLoadingPreviousMessages(true);

      const response = await getChatMessages({
        roomId,
        limit: MESSAGE_LIMIT,
        lastId: oldestMessage.id,
        lastCreatedAtMillis: new Date(oldestMessage.createdAt).getTime(),
      });

      const previousMessages = [...response.items]
        .reverse()
        .map(mapChatMessageResponseItemToChatMessage);

      setMessages((prevMessages) => {
        const existingMessageIds = new Set(
          prevMessages.map((message) => message.id),
        );

        const uniquePreviousMessages = previousMessages.filter(
          (message) => !existingMessageIds.has(message.id),
        );

        return [...uniquePreviousMessages, ...prevMessages];
      });

      setHasNextMessages(response.hasNext);

      requestAnimationFrame(() => {
        const currentChatBox = chatBoxRef.current;

        if (!currentChatBox) {
          return;
        }

        const nextScrollHeight = currentChatBox.scrollHeight;
        const addedScrollHeight = nextScrollHeight - previousScrollHeight;

        currentChatBox.scrollTop = previousScrollTop + addedScrollHeight;
      });
    } catch (error) {
      console.error(error);
      alert("이전 메시지를 불러오지 못했습니다.");
    } finally {
      setIsLoadingPreviousMessages(false);
    }
  }

  function handleChatBoxScroll() {
    const chatBox = chatBoxRef.current;

    if (!chatBox) {
      return;
    }

    if (chatBox.scrollTop <= PREVIOUS_MESSAGE_SCROLL_THRESHOLD) {
      void loadPreviousMessages();
    }
  }

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
      writerName: user.nickname,
      content,
      clientMessageId,
    });

    setMessages((prevMessages) => [...prevMessages, pendingMessage]);
    setMessageInput("");

    requestAnimationFrame(() => {
      const chatBox = chatBoxRef.current;

      if (!chatBox) {
        return;
      }

      chatBox.scrollTop = chatBox.scrollHeight;
    });

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
            status: "failed",
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
          status: "pending",
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
            status: "failed",
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
              isConnected ? "connected" : "disconnected"
            }`}
          />
        </div>

        <div
          ref={chatBoxRef}
          className="chat-room-box"
          onScroll={handleChatBoxScroll}
        >
          {isLoadingPreviousMessages && (
            <div className="chat-room-history-notice">
              이전 메시지를 불러오는 중입니다.
            </div>
          )}

          {!isLoadingPreviousMessages &&
            hasNextMessages &&
            messages.length > 0 && (
              <div className="chat-room-history-notice">
                위로 스크롤하면 이전 메시지를 불러옵니다.
              </div>
            )}

          {messages.length > 0 ? (
            messages.map((message) => {
              const isMine = user.id === message.writerId;
              const writerName =
                message.writerName ?? `사용자 ${message.writerId}`;

              return (
                <div
                  key={`${message.id}-${message.clientMessageId ?? message.createdAt}`}
                  className={`chat-message-row ${isMine ? "me" : "other"}`}
                >
                  {!isMine && (
                    <div className="chat-message-side">
                      <div className="chat-message-avatar">
                        {getAvatarText(writerName)}
                      </div>

                      <span className="chat-message-name">
                        {message.writerName}
                      </span>
                    </div>
                  )}

                  <div
                    className={`chat-message-bubble ${isMine ? "me" : "other"} ${
                      isMine ? message.status : "sent"
                    }`}
                  >
                    <div className="chat-message-content">
                      {message.content}
                    </div>

                    <div className="chat-message-meta">
                      {isMine && message.status === "pending" && (
                        <span className="chat-message-status">전송 중</span>
                      )}

                      {isMine && message.status === "failed" && (
                        <>
                          <span>{formatKoreanChatTime(message.createdAt)}</span>

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

                      {(!isMine || message.status === "sent") && (
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
                {isLoadingMessages
                  ? "최근 메시지를 불러오는 중입니다."
                  : isConnected
                    ? "아직 메시지가 없습니다."
                    : "채팅 서버에 연결 중입니다."}
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
                ? "메시지를 입력하세요."
                : "채팅 서버에 연결 중입니다. 잠시 후 다시 시도해주세요."
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
