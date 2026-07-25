import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@/types/user";
import type { MyChatRoom, MyChatRoomCursor } from "@/types/chatRoom";
import { formatKoreanChatTime } from "@/utils/dateFormatter";
import { getMyChatRoom, getMyChatRooms, leaveChatRoom } from "@/apis/chatRoomApi";
import { createStompClient } from "@/apis/stompClient";
import { subscribeMyChatRoomBadge } from "@/apis/chatStompApi";
import LoadingButton from "@/components/Button/LoadingButton";
import "./MyChatRoomPage.css";

type MyChatRoomsPageProps = {
  user: User | null;
};

const MY_CHAT_ROOM_LIMIT = 10;
const mockMyChatRooms: MyChatRoom[] = [
  {
    id: 101,
    hostId: "1",
    title: "비트코인 단기 시황방",
    category: "CRYPTO_CURRENCY",
    description: "BTC 단기 흐름과 주요 지지/저항을 이야기하는 방입니다.",
    lastMsgContent: "오늘 저항선은 108K 부근으로 보입니다.",
    lastMsgCreatedAt: "2026-06-11T10:10:00",
    unreadMsgCnt: 3,
    memberCnt: 128,
  },
  {
    id: 102,
    hostId: "12",
    title: "이더리움 장기 투자방",
    category: "CRYPTO_CURRENCY",
    description: "ETH 장기 관점과 생태계 뉴스를 공유합니다.",
    lastMsgContent: "ETF 자금 유입 체크해볼게요.",
    lastMsgCreatedAt: "2026-06-11T09:40:00",
    unreadMsgCnt: 0,
    memberCnt: 86,
  },
  {
    id: 103,
    hostId: "1",
    title: "알트코인 관찰방",
    category: "CRYPTO_CURRENCY",
    description: "거래량과 테마 중심으로 알트코인을 함께 봅니다.",
    lastMsgContent: null,
    lastMsgCreatedAt: null,
    unreadMsgCnt: 0,
    memberCnt: 64,
  },
];

export default function MyChatRoomsPage({ user }: MyChatRoomsPageProps) {
  const isLoggedIn = user !== null;
  const userId = user?.id;

  const navigate = useNavigate();

  const [myChatRooms, setMyChatRooms] = useState<MyChatRoom[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(isLoggedIn);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [leavingRoomId, setLeavingRoomId] = useState<number | null>(null);

  // 배지 이벤트 처리용(4.9): 현재 목록 방 id 집합 + prepend 진행 중 방(중복 조회 방지).
  const roomIdsRef = useRef<Set<number>>(new Set());
  const prependingRoomIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    roomIdsRef.current = new Set(
      myChatRooms.map((room) => Number(room.id)),
    );
  }, [myChatRooms]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isCancelled = false;

    async function loadInitialMyChatRooms() {
      try {
        const response = await getMyChatRooms({
          limit: MY_CHAT_ROOM_LIMIT,
        });

        if (isCancelled) {
          return;
        }

        setMyChatRooms(response.items);
        setHasNext(response.hasNext);
      } catch (error) {
        console.error("failed to load my chat rooms:", error);

        if (!isCancelled) {
          // setMyChatRooms([]);
          setMyChatRooms(mockMyChatRooms);
          setHasNext(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitialMyChatRooms();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  async function prependMissingRoom(roomId: number) {
    if (prependingRoomIdsRef.current.has(roomId)) {
      return;
    }

    prependingRoomIdsRef.current.add(roomId);

    try {
      const room = await getMyChatRoom(roomId);

      setMyChatRooms((prevRooms) =>
        prevRooms.some((prevRoom) => Number(prevRoom.id) === roomId)
          ? prevRooms
          : [room, ...prevRooms],
      );
    } catch (error) {
      console.error("failed to load chat room for badge:", error);
    } finally {
      prependingRoomIdsRef.current.delete(roomId);
    }
  }

  useEffect(() => {
    if (!isLoggedIn || userId === undefined) {
      return;
    }

    const client = createStompClient();

    client.onConnect = () => {
      subscribeMyChatRoomBadge(client, (event) => {
        const roomId = Number(event.payload.id);

        if (Number.isNaN(roomId)) {
          return;
        }

        if (
          event.payload.memberIds.length > 0 &&
          !event.payload.memberIds.includes(String(userId))
        ) {
          return;
        }

        // 목록에 없는 방이면 단건 조회 후 맨 앞에 추가(4.9).
        if (!roomIdsRef.current.has(roomId)) {
          void prependMissingRoom(roomId);
          return;
        }

        // 목록에 있는 방이면 갱신 후 맨 앞으로 이동(4.9).
        setMyChatRooms((prevRooms) => {
          const targetRoom = prevRooms.find(
            (room) => Number(room.id) === roomId,
          );

          if (!targetRoom) {
            return prevRooms;
          }

          const updatedRoom: MyChatRoom = {
            ...targetRoom,
            unreadMsgCnt: targetRoom.unreadMsgCnt + 1,
            lastMsgContent: event.payload.lastMsgContent,
            lastMsgCreatedAt: event.payload.lastMsgCreatedAt,
          };

          const remainingRooms = prevRooms.filter(
            (room) => Number(room.id) !== roomId,
          );

          return [updatedRoom, ...remainingRooms];
        });
      });
    };

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [isLoggedIn, userId]);

  async function loadMoreMyChatRooms(cursor: MyChatRoomCursor) {
    setIsLoadingMore(true);

    try {
      const response = await getMyChatRooms({
        limit: MY_CHAT_ROOM_LIMIT,
        lastUnreadFlag: cursor.lastUnreadFlag,
        lastMsgCreatedAt: cursor.lastMsgCreatedAt,
        lastId: cursor.lastId,
      });

      setMyChatRooms((prevRooms) => [...prevRooms, ...response.items]);
      setHasNext(response.hasNext);
    } catch (error) {
      console.error("failed to load more my chat rooms:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (isLoadingMore || myChatRooms.length === 0) {
      return;
    }

    const lastRoom = myChatRooms[myChatRooms.length - 1];

    loadMoreMyChatRooms({
      lastUnreadFlag: lastRoom.unreadMsgCnt > 0,
      lastMsgCreatedAt: lastRoom.lastMsgCreatedAt,
      lastId: lastRoom.id,
    });
  }

  function handleEnterRoom(roomId: number) {
    navigate(`/chat/room?roomId=${roomId}`);
  }

  function handleUpdateRoom(room: MyChatRoom) {
    const params = new URLSearchParams({
      roomId: String(room.id),
      title: room.title,
      description: room.description,
      category: room.category,
    });

    navigate(`/chat/update?${params.toString()}`);
  }

  async function handleLeaveRoom(roomId: number) {
    const confirmed = window.confirm("이 채팅방에서 나가시겠습니까?");

    if (!confirmed) {
      return;
    }

    setLeavingRoomId(roomId);

    try {
      await leaveChatRoom(roomId);

      setMyChatRooms((prevRooms) =>
        prevRooms.filter((room) => room.id !== roomId),
      );

      alert("채팅방에서 나갔습니다.");
    } catch (error) {
      console.error("failed to leave chat room:", error);
      alert("채팅방 나가기 중 문제가 발생했습니다.");
    } finally {
      setLeavingRoomId(null);
    }
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

      {isLoading ? (
        <div className="my-chat-rooms-empty-card">
          내 채팅방을 불러오는 중입니다.
        </div>
      ) : myChatRooms.length > 0 ? (
        <>
          <div className="my-chat-room-list">
            {myChatRooms.map((room) => {
              const isOwner = user.id === room.hostId;
              const hasUnread = room.unreadMsgCnt > 0;
              const isLeaving = leavingRoomId === room.id;

              return (
                <article
                  key={room.id}
                  className={`my-chat-room-card ${
                    hasUnread ? "has-unread" : ""
                  }`}
                >
                  <div className="my-chat-room-main">
                    <div className="my-chat-room-title-row">
                      <h2>{room.title}</h2>

                      {hasUnread && (
                        <span className="my-chat-room-unread-badge">
                          {room.unreadMsgCnt > 99 ? "99+" : room.unreadMsgCnt}
                        </span>
                      )}
                    </div>

                    <div className="my-chat-room-meta">
                      {isOwner && (
                        <span
                          className="my-chat-room-meta-item owner"
                          title="방장"
                        >
                          <span aria-hidden="true">👑</span>
                          <span>방장</span>
                        </span>
                      )}

                      <span className="my-chat-room-meta-item">
                        ID {room.id}
                      </span>
                      <span className="my-chat-room-meta-item">
                        멤버 {room.memberCnt}명
                      </span>
                      <span className="my-chat-room-meta-item">가상화폐</span>
                    </div>

                    <p className="my-chat-room-description">
                      {room.description}
                    </p>

                    <div className="my-chat-room-last-message">
                      <strong>최근 메시지</strong>
                      <span>
                        {room.lastMsgContent ?? "최근 메시지가 없습니다."}
                      </span>
                      <em>
                        {room.lastMsgCreatedAt
                          ? formatKoreanChatTime(room.lastMsgCreatedAt)
                          : "최근 메시지 없음"}
                      </em>
                    </div>
                  </div>

                  <div className="my-chat-room-actions">
                    <button
                      type="button"
                      className="my-chat-room-button primary"
                      onClick={() => handleEnterRoom(room.id)}
                      disabled={isLeaving}
                    >
                      입장하기
                    </button>

                    {isOwner && (
                      <button
                        type="button"
                        className="my-chat-room-button"
                        onClick={() => handleUpdateRoom(room)}
                        disabled={isLeaving}
                      >
                        수정하기
                      </button>
                    )}

                    <LoadingButton
                      type="button"
                      className="my-chat-room-button danger"
                      isLoading={isLeaving}
                      loadingText="나가는 중..."
                      onClick={() => handleLeaveRoom(room.id)}
                    >
                      나가기
                    </LoadingButton>
                  </div>
                </article>
              );
            })}
          </div>

          {hasNext && (
            <LoadingButton
              className="my-chat-room-more-button"
              isLoading={isLoadingMore}
              loadingText="불러오는 중..."
              onClick={handleLoadMore}
            >
              더 보기
            </LoadingButton>
          )}
        </>
      ) : (
        <div className="my-chat-rooms-empty-card">
          참여 중인 채팅방이 없습니다.
        </div>
      )}
    </section>
  );
}
