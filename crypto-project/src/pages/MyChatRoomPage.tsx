import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@/types/user';
import type { MyChatRoom, MyChatRoomCursor } from '@/types/chatRoom';
import { formatKoreanChatTime } from '@/utils/dateFormatter';
import { getMyChatRooms, leaveChatRoom } from '@/apis/chatApi';
import { createStompClient } from '@/apis/stompClient';
import { subscribeMyChatRoomBadge } from '@/apis/chatStompApi';
import LoadingButton from '@/components/Button/LoadingButton';
import './MyChatRoomPage.css';

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
  const [leavingRoomId, setLeavingRoomId] = useState<number | null>(null);

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
        console.error('failed to load my chat rooms:', error);

        if (!isCancelled) {          
          setMyChatRooms([]);
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

        setMyChatRooms((prevRooms) =>
          prevRooms.map((room) => {
            if (room.id !== roomId) {
              return room;
            }

            return {
              ...room,
              unreadMsgCnt: room.unreadMsgCnt + 1,
              lastMsgContent: event.payload.lastMsgContent,
              lastMsgCreatedAt: event.payload.lastMsgCreatedAt,
            };
          }),
        );
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
      console.error('failed to load more my chat rooms:', error);
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
    const confirmed = window.confirm('이 채팅방에서 나가시겠습니까?');

    if (!confirmed) {
      return;
    }

    setLeavingRoomId(roomId);

    try {
      await leaveChatRoom(roomId);

      setMyChatRooms((prevRooms) =>
        prevRooms.filter((room) => room.id !== roomId),
      );

      alert('채팅방에서 나갔습니다.');
    } catch (error) {
      console.error('failed to leave chat room:', error);
      alert('채팅방 나가기 중 문제가 발생했습니다.');
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
                    hasUnread ? 'has-unread' : ''
                  }`}
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
                        {room.lastMsgContent ?? '최근 메시지가 없습니다.'}
                      </span>
                      <em>
                        {room.lastMsgCreatedAt
                          ? formatKoreanChatTime(room.lastMsgCreatedAt)
                          : '최근 메시지 없음'}
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