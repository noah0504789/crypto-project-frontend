import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@/types/user";
import type { MyChatRoom, MyChatRoomCursor } from "@/types/chatRoom";
import { formatKoreanChatTime } from "@/utils/dateFormatter";
import {
  getMyChatRoom,
  getMyChatRooms,
  leaveChatRoom,
  waitForPendingActivityReports,
} from "@/apis/chatRoomApi";
import { createStompClient } from "@/apis/stompClient";
import { subscribeMyChatRoomBadge } from "@/apis/chatStompApi";
import LoadingButton from "@/components/Button/LoadingButton";
import "./MyChatRoomPage.css";

type MyChatRoomsPageProps = {
  user: User | null;
};

const MY_CHAT_ROOM_LIMIT = 10;

export default function MyChatRoomsPage({ user }: MyChatRoomsPageProps) {
  const isLoggedIn = user !== null;
  const userId = user?.id;

  const navigate = useNavigate();

  const [myChatRooms, setMyChatRooms] = useState<MyChatRoom[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(isLoggedIn);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // 배지 이벤트 처리용(4.9): 현재 목록 방 id 집합 + prepend 진행 중 방(중복 조회 방지).
  const roomIdsRef = useRef<Set<string>>(new Set());
  const prependingRoomIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    roomIdsRef.current = new Set(myChatRooms.map((room) => room.id));
  }, [myChatRooms]);

  useEffect(() => {
    if (!isLoggedIn) {
      return;
    }

    let isCancelled = false;

    async function loadInitialMyChatRooms() {
      try {
        await waitForPendingActivityReports();

        if (isCancelled) {
          return;
        }

        const response = await getMyChatRooms({
          limit: MY_CHAT_ROOM_LIMIT,
        });

        if (isCancelled) {
          return;
        }

        setMyChatRooms(response.items ?? []);
        setHasNext(response.hasNext ?? false);
        setLoadError(false);
      } catch (error) {
        console.error("failed to load my chat rooms:", error);

        if (!isCancelled) {
          setMyChatRooms([]);
          setHasNext(false);
          setLoadError(true);
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
  }, [isLoggedIn, reloadKey]);

  async function prependMissingRoom(roomId: string) {
    if (prependingRoomIdsRef.current.has(roomId)) {
      return;
    }

    prependingRoomIdsRef.current.add(roomId);

    try {
      const room = await getMyChatRoom(roomId);

      setMyChatRooms((prevRooms) =>
        prevRooms.some((prevRoom) => prevRoom.id === roomId)
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
        const roomId = event.roomId;

        if (!roomId) {
          return;
        }

        // 목록에 없는 방이면 단건 조회 후 맨 앞에 추가(4.9).
        if (!roomIdsRef.current.has(roomId)) {
          void prependMissingRoom(roomId);
          return;
        }

        // 목록에 있는 방이면 갱신 후 맨 앞으로 이동(4.9).
        setMyChatRooms((prevRooms) => {
          const targetRoom = prevRooms.find((room) => room.id === roomId);

          if (!targetRoom) {
            return prevRooms;
          }

          const updatedRoom: MyChatRoom = {
            ...targetRoom,
            unreadMsgCnt: targetRoom.unreadMsgCnt + 1,
            lastMsgContent: event.lastMsgContent,
            lastMsgCreatedAt: event.lastMsgCreatedAt,
          };

          const remainingRooms = prevRooms.filter(
            (room) => room.id !== roomId,
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

      setMyChatRooms((prevRooms) => [
        ...prevRooms,
        ...(response.items ?? []),
      ]);
      setHasNext(response.hasNext ?? false);
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

  function handleEnterRoom(roomId: string) {
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

  async function handleLeaveRoom(roomId: string) {
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

  function handleRetry() {
    setIsLoading(true);
    setLoadError(false);
    setReloadKey((prevKey) => prevKey + 1);
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
      ) : loadError ? (
        <div className="my-chat-rooms-empty-card">
          <p>내 채팅방을 불러오지 못했습니다.</p>
          <button
            type="button"
            className="my-chat-room-button primary"
            onClick={handleRetry}
          >
            다시 시도
          </button>
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

                      <span className="my-chat-room-meta-item">가상화폐</span>
                      <span className="my-chat-room-meta-item">
                        멤버 {room.memberCnt}명
                      </span>
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
                          : ""}
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
