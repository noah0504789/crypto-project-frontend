import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPopularChatRooms, joinChatRoom } from "@/apis/chatRoomApi";
import LoadingButton from "@/components/Button/LoadingButton";
import type { User } from "@/types/user";
import type { PopularChatRoom, PopularChatRoomCursor } from "@/types/chatRoom";
import { formatKoreanDateTime } from "@/utils/dateFormatter";
import "./ChatPage.css";

type ChatPageProps = {
  user: User | null;
};

const POPULAR_CHAT_ROOM_LIMIT = 10;
const DEFAULT_CATEGORY = "CRYPTO_CURRENCY";

export default function ChatPage({ user }: ChatPageProps) {
  const navigate = useNavigate();

  const [popularChatRooms, setPopularChatRooms] = useState<PopularChatRoom[]>(
    [],
  );
  const [hasNext, setHasNext] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [enteringRoomId, setEnteringRoomId] = useState<string | null>(null);

  const isLoggedIn = user !== null;

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialPopularChatRooms() {
      try {
        const response = await getPopularChatRooms({
          limit: POPULAR_CHAT_ROOM_LIMIT,
          category: DEFAULT_CATEGORY,
        });

        if (isCancelled) {
          return;
        }

        setPopularChatRooms(response.items ?? []);
        setHasNext(response.hasNext ?? false);
      } catch (error) {
        console.error("failed to load popular chat rooms:", error);

        if (!isCancelled) {
          setPopularChatRooms([]);
          setHasNext(false);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadInitialPopularChatRooms();

    return () => {
      isCancelled = true;
    };
  }, []);

  async function loadMorePopularChatRooms(cursor: PopularChatRoomCursor) {
    setIsLoadingMore(true);

    try {
      const response = await getPopularChatRooms({
        limit: POPULAR_CHAT_ROOM_LIMIT,
        category: DEFAULT_CATEGORY,
        lastId: cursor.lastId,
        lastPopularity: cursor.lastPopularity,
      });

      setPopularChatRooms((prevRooms) => [
        ...prevRooms,
        ...(response.items ?? []),
      ]);
      setHasNext(response.hasNext ?? false);
    } catch (error) {
      console.error("failed to load more popular chat rooms:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleLoadMore() {
    if (isLoadingMore || popularChatRooms.length === 0) {
      return;
    }

    const lastRoom = popularChatRooms[popularChatRooms.length - 1];

    loadMorePopularChatRooms({
      lastId: lastRoom.id,
      lastPopularity: lastRoom.popularity,
    });
  }

  function handleEnterRoom(roomId: string) {
    if (!isLoggedIn) {
      alert("로그인이 필요한 서비스입니다.");
      return;
    }

    setEnteringRoomId(roomId);

    joinChatRoom(roomId)
      .then(() => {
        navigate(`/chat/room?roomId=${roomId}`);
      })
      .catch((error) => {
        console.error(error);
        alert("채팅방 입장에 실패했습니다. 다시 시도해 주세요.");
        setEnteringRoomId(null);
      });
  }

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
            <Link to="/chat/create" className="create-chat-room-button">
              채팅방 생성
            </Link>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="popular-chat-room-empty-card">
          인기 채팅방을 불러오는 중입니다.
        </div>
      ) : popularChatRooms.length > 0 ? (
        <>
          <div className="popular-chat-room-list">
            {popularChatRooms.map((room, index) => (
              <article key={room.id} className="popular-chat-room-card">
                <div className="popular-chat-room-main">
                  <div className="popular-chat-room-title-row">
                    <h2>{room.title}</h2>
                    <span className="popular-chat-room-badge">
                      인기 {index + 1}위
                    </span>
                  </div>

                  <p className="popular-chat-room-description">
                    {room.description}
                  </p>

                  <div className="popular-chat-room-meta">
                    <span>멤버 {room.memberCnt}명</span>
                    <span>{formatKoreanDateTime(room.createdAt)}</span>
                  </div>
                </div>

                <LoadingButton
                  isLoading={enteringRoomId === room.id}
                  loadingText="입장 중..."
                  className="popular-chat-room-enter-button"
                  disabled={enteringRoomId !== null}
                  onClick={() => handleEnterRoom(room.id)}
                >
                  입장하기
                </LoadingButton>
              </article>
            ))}
          </div>

          {hasNext && (
            <LoadingButton
              className="popular-chat-room-more-button"
              isLoading={isLoadingMore}
              loadingText="불러오는 중..."
              onClick={handleLoadMore}
            >
              더 보기
            </LoadingButton>
          )}
        </>
      ) : (
        <div className="popular-chat-room-empty-card">
          아직 인기 채팅방이 없습니다.
        </div>
      )}
    </section>
  );
}
