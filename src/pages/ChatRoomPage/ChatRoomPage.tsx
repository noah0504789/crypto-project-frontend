import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { Client } from "@stomp/stompjs";

import { getChatMessages } from "@/apis/chatMessageApi";
import { getChatRoom, reportActivity } from "@/apis/chatRoomApi";
import {
  sendChatMessage,
  subscribeChatMessageAck,
  subscribeChatRoomMessages,
} from "@/apis/chatStompApi";
import { createStompClient } from "@/apis/stompClient";
import { getUserProfile } from "@/apis/userApi";
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

const MESSAGE_LIMIT = 10;
const PREVIOUS_MESSAGE_SCROLL_THRESHOLD = 40;
const ACK_TIMEOUT_MS = 3000;

export default function ChatRoomPage({ user }: ChatRoomPageProps) {
  const [searchParams] = useSearchParams();

  const roomIdParam = searchParams.get("roomId");
  const roomId = roomIdParam ?? "";

  const stompClientRef = useRef<Client | null>(null);
  const chatBoxRef = useRef<HTMLDivElement | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingPreviousMessages, setIsLoadingPreviousMessages] =
    useState(false);
  const [hasNextMessages, setHasNextMessages] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");
  const [writerProfiles, setWriterProfiles] = useState<Record<string, string>>(
    {},
  );

  // clientMessageId별 ACK 대기 타이머. 시간 내 ACK/브로드캐스트가 없으면 failed 처리(4.3).
  const ackTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  // 읽음 위치 보고(4.7): msgCnt를 시작점으로, 브로드캐스트 1건당 +1.
  const lastReadSeqRef = useRef(0);
  const lastMsgCreatedAtMsRef = useRef(0);
  const hasRoomDetailRef = useRef(false);

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

  function startAckTimer(clientMessageId: string) {
    const timers = ackTimersRef.current;
    const existingTimer = timers.get(clientMessageId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      timers.delete(clientMessageId);

      setMessages((prevMessages) =>
        prevMessages.map((message) =>
          message.clientMessageId === clientMessageId &&
          message.status === "pending"
            ? { ...message, status: "failed" }
            : message,
        ),
      );
    }, ACK_TIMEOUT_MS);

    timers.set(clientMessageId, timer);
  }

  function clearAckTimer(clientMessageId: string) {
    const timers = ackTimersRef.current;
    const timer = timers.get(clientMessageId);

    if (timer) {
      clearTimeout(timer);
      timers.delete(clientMessageId);
    }
  }

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

        const nextMessages = [...(response.items ?? [])]
          .reverse()
          .map(mapChatMessageResponseItemToChatMessage);

        setMessages(nextMessages);
        setHasNextMessages(response.hasNext ?? false);

        const newestMessage = nextMessages[nextMessages.length - 1];

        if (newestMessage) {
          lastMsgCreatedAtMsRef.current = new Date(
            newestMessage.createdAt,
          ).getTime();
        }

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

  // 방 상세 조회(4.5): 제목·읽음 시퀀스 시작점(msgCnt).
  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId) {
      return;
    }

    hasRoomDetailRef.current = false;

    let isCancelled = false;

    async function loadRoomDetail() {
      try {
        const room = await getChatRoom(roomId);

        if (isCancelled) {
          return;
        }

        setRoomTitle(room.title);
        lastReadSeqRef.current = room.msgCnt ?? 0;
        hasRoomDetailRef.current = true;
      } catch (error) {
        console.error(error);
      }
    }

    void loadRoomDetail();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn, isInvalidRoomId, roomId]);

  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId || !user) {
      return;
    }

    const client = createStompClient();
    const ackTimers = ackTimersRef.current;

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

        // 내 메시지가 브로드캐스트로 확정됨 → ACK 타임아웃 취소(4.3).
        if (event.clientMessageId) {
          clearAckTimer(event.clientMessageId);
        }

        // 서버 저장 1건 = msgCnt+1. 읽음 시퀀스를 함께 올린다(4.7).
        lastReadSeqRef.current += 1;
        lastMsgCreatedAtMsRef.current = event.timestamp || Date.now();

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
        // ACK 도착 → 타임아웃 취소(성공/실패 공통, 4.3).
        clearAckTimer(ack.clientMessageId);

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

      ackTimers.forEach((timer) => clearTimeout(timer));
      ackTimers.clear();

      void client.deactivate();
    };
  }, [isLoggedIn, isInvalidRoomId, roomId, user]);

  // 읽음 위치 보고(4.7): 방을 떠날 때(언마운트) + 탭 종료/새로고침(beforeunload).
  useEffect(() => {
    if (!isLoggedIn || isInvalidRoomId) {
      return;
    }

    function reportReadActivity() {
      // 방 상세(msgCnt)를 못 받았으면 시퀀스 시작점이 없어 보고하지 않는다(잘못된 0 보고 방지).
      if (!hasRoomDetailRef.current) {
        return;
      }

      reportActivity({
        roomId,
        lastMsgReadSeq: lastReadSeqRef.current,
        lastMsgCreatedAtMs: lastMsgCreatedAtMsRef.current,
      });
    }

    window.addEventListener("beforeunload", reportReadActivity);

    return () => {
      window.removeEventListener("beforeunload", reportReadActivity);
      reportReadActivity();
    };
  }, [isLoggedIn, isInvalidRoomId, roomId]);

  // 타 유저 프로필 조회(4.8): 아바타/닉네임을 실제 값으로. userApi가 캐시+dedup 처리.
  useEffect(() => {
    if (!user) {
      return;
    }

    const unknownWriterIds = Array.from(
      new Set(
        messages
          .map((message) => message.writerId)
          .filter(
            (writerId) =>
              writerId !== user.id && writerProfiles[writerId] === undefined,
          ),
      ),
    );

    if (unknownWriterIds.length === 0) {
      return;
    }

    let isCancelled = false;

    unknownWriterIds.forEach((writerId) => {
      getUserProfile(writerId)
        .then((profile) => {
          if (isCancelled) {
            return;
          }

          setWriterProfiles((prevProfiles) =>
            prevProfiles[writerId] !== undefined
              ? prevProfiles
              : { ...prevProfiles, [writerId]: profile.nickname },
          );
        })
        .catch(() => {});
    });

    return () => {
      isCancelled = true;
    };
  }, [messages, user, writerProfiles]);

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

      const previousMessages = [...(response.items ?? [])]
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

      setHasNextMessages(response.hasNext ?? false);

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
      roomId,
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

    if (isPublished) {
      startAckTimer(clientMessageId);
    } else {
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

  function handleRetryMessage(messageId: string) {
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

    if (isPublished) {
      startAckTimer(nextClientMessageId);
    } else {
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
            <h1>{roomTitle || "채팅방"}</h1>
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
                writerProfiles[message.writerId] ??
                message.writerName ??
                `사용자 ${message.writerId}`;

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

                      <span className="chat-message-name">{writerName}</span>
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
