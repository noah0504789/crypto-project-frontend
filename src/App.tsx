import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import type { User } from "@/types/user";
import type { Notification } from "@/types/notification";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/apis/apiClient";
import { logout } from "@/apis/authApi";
import { getMyProfile } from "@/apis/userApi";
import { createStompClient } from "@/apis/stompClient";
import { subscribeWebNotifications } from "@/apis/notificationStompApi";
import {
  getMyNotifications,
  markNotificationAsRead,
} from "@/apis/notificationApi";
import {
  mapNotificationResponseToNotification,
  mapWebNotificationToNotification,
} from "@/utils/notificationMapper";
import { getAccessToken, removeAccessToken } from "@/utils/authStorage";
import Header from "@/components/Header/Header";
import LoginModal from "@/components/Modal/LoginModal";
import HomePage from "@/pages/HomePage/HomePage";
import ChatPage from "@/pages/ChatPage/ChatPage";
import MyChatRoomPage from "@/pages/MyChatRoomPage/MyChatRoomPage";
import CreateChatRoomPage from "@/pages/CreateChatRoomPage/CreateChatRoomPage";
import UpdateChatRoomPage from "@/pages/UpdateChatRoomPage/UpdateChatRoomPage";
import ChatRoomPage from "@/pages/ChatRoomPage/ChatRoomPage";
import PriceAlertsPage from "@/pages/PriceAlertsPage/PriceAlertsPage";
import LoginSuccessPage from "@/pages/LoginSuccessPage/LoginSuccessPage";
import AccountPage from "@/pages/AccountPage/AccountPage";
import ProfileEditPage from "@/pages/ProfileEditPage/ProfileEditPage";
import Footer from "@/components/Footer/Footer";
import "./App.css";

export default function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [isInitializingUser, setIsInitializingUser] = useState(
    () => getAccessToken() !== null,
  );
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNextNotification, setHasNextNotification] = useState(false);
  const [hasLoadedNotifications, setHasLoadedNotifications] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // 앱 시작 시 토큰이 있으면 내 프로필을 불러와 로그인 상태를 복원한다.
  // (토큰 없으면 로그아웃 상태 유지 → 각 페이지가 user === null 안내를 렌더)
  useEffect(() => {
    if (!getAccessToken()) {
      return;
    }

    let isCancelled = false;

    async function initializeUser() {
      try {
        const profile = await getMyProfile();
        if (!isCancelled) {
          setUser(profile);
        }
      } catch (error) {
        // 401 → apiClient가 재발급을 시도하고, 실패하면 토큰을 정리 + 세션 만료 이벤트를 쏜다.
        // 여기서는 로그아웃 상태만 확정한다.
        console.error("failed to restore user:", error);
        if (!isCancelled) {
          setUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsInitializingUser(false);
        }
      }
    }

    void initializeUser();

    return () => {
      isCancelled = true;
    };
  }, []);

  // 요청 도중 세션이 만료되면(토큰 재발급까지 실패) 로그아웃 처리 + 로그인 유도.
  useEffect(() => {
    function handleSessionExpired() {
      setUser(null);
      setNotifications([]);
      setHasNextNotification(false);
      setHasLoadedNotifications(false);
      setIsLoginModalOpen(true);
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, []);

  // 로그인 상태면 실시간 알림(STOMP /user/topic/notification/)을 구독한다.
  useEffect(() => {
    if (!user) {
      return;
    }

    const client = createStompClient();

    client.onConnect = () => {
      subscribeWebNotifications(client, (event) => {
        const notification = mapWebNotificationToNotification(event);

        setNotifications((prevNotifications) => {
          const alreadyExists = prevNotifications.some(
            (item) => item.id === notification.id,
          );
          return alreadyExists
            ? prevNotifications
            : [notification, ...prevNotifications];
        });
      });
    };

    client.activate();

    return () => {
      void client.deactivate();
    };
  }, [user]);

  // 로그인 상태가 되면 최신 알림을 조회해 서버의 안 읽음 상태를 헤더 배지에 반영한다.
  useEffect(() => {
    if (!user) {
      return;
    }

    let isCancelled = false;

    async function loadInitialNotifications() {
      setIsLoadingNotifications(true);
      try {
        const page = await getMyNotifications();

        if (isCancelled) {
          return;
        }

        const items = page.items.map(mapNotificationResponseToNotification);
        setNotifications((prevNotifications) => {
          const loadedIds = new Set(items.map((notification) => notification.id));
          const liveItems = prevNotifications.filter(
            (notification) => !loadedIds.has(notification.id),
          );
          return [...liveItems, ...items];
        });
        setHasNextNotification(page.hasNext);
        setHasLoadedNotifications(true);
      } catch (error) {
        console.error("failed to load notifications:", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingNotifications(false);
        }
      }
    }

    void loadInitialNotifications();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  // 로그인 직후 조회가 실패했으면 알림 벨을 열 때 첫 페이지를 다시 불러온다.
  async function handleOpenNotifications() {
    if (
      !user ||
      hasLoadedNotifications ||
      isLoadingNotifications
    ) {
      return;
    }

    setIsLoadingNotifications(true);
    try {
      const page = await getMyNotifications();
      const items = page.items.map(mapNotificationResponseToNotification);
      // 이미 받은 실시간(STOMP) 항목은 맨 위에 유지하고 그 아래에 REST 목록을 둔다.
      setNotifications((prevNotifications) => {
        const loadedIds = new Set(items.map((notification) => notification.id));
        const liveItems = prevNotifications.filter(
          (notification) => !loadedIds.has(notification.id),
        );
        return [...liveItems, ...items];
      });
      setHasNextNotification(page.hasNext);
      setHasLoadedNotifications(true);
    } catch (error) {
      console.error("failed to load notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  // 드롭다운을 아래로 스크롤하면 현재 목록의 가장 오래된(맨 아래) 항목 커서로 다음 페이지를 append 한다.
  async function handleLoadMoreNotifications() {
    if (isLoadingNotifications || !hasNextNotification) {
      return;
    }

    const cursorItem = [...notifications]
      .reverse()
      .find(
        (notification) =>
          notification.recipientId != null &&
          notification.deliveredAtMs != null,
      );

    if (!cursorItem) {
      return;
    }

    setIsLoadingNotifications(true);
    try {
      const page = await getMyNotifications({
        lastRecipientId: cursorItem.recipientId,
        lastDeliveredAtMs: cursorItem.deliveredAtMs,
      });
      const olderItems = page.items.map(mapNotificationResponseToNotification);
      setNotifications((prevNotifications) => {
        const existingIds = new Set(
          prevNotifications.map((notification) => notification.id),
        );
        const deduped = olderItems.filter(
          (notification) => !existingIds.has(notification.id),
        );
        return [...prevNotifications, ...deduped];
      });
      setHasNextNotification(page.hasNext);
    } catch (error) {
      console.error("failed to load more notifications:", error);
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  function handleOpenLoginModal() {
    setIsLoginModalOpen(true);
  }

  function handleCloseLoginModal() {
    setIsLoginModalOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
      alert("로그아웃 성공했습니다!");
    } catch (error) {
      console.error("logout failed:", error);
      alert("로그아웃 처리 중 문제가 발생했습니다.");
    } finally {
      removeAccessToken();
      setUser(null);
      setNotifications([]);
      setHasNextNotification(false);
      setHasLoadedNotifications(false);
      navigate("/", { replace: true });
    }
  }

  async function handleReadNotification(notificationId: string) {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                read: true,
              }
            : notification,
        ),
      );
    } catch (error) {
      console.error("failed to mark notification as read:", error);
    }
  }

  return (
    <div className="app">
      <Header
        user={user}
        notifications={notifications}
        onOpenNotifications={handleOpenNotifications}
        onReadNotification={handleReadNotification}
        onLoadMoreNotifications={handleLoadMoreNotifications}
        hasNextNotification={hasNextNotification}
        isLoadingNotifications={isLoadingNotifications}
        onLogin={handleOpenLoginModal}
        onLogout={handleLogout}
      />

      <main className="main">
        {isInitializingUser ? (
          <section className="app-loading">
            로그인 상태를 확인하는 중...
          </section>
        ) : (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/chat" element={<ChatPage user={user} />} />
            <Route path="/chat/my" element={<MyChatRoomPage user={user} />} />
            <Route
              path="/chat/create"
              element={<CreateChatRoomPage user={user} />}
            />
            <Route
              path="/chat/update"
              element={<UpdateChatRoomPage user={user} />}
            />
            <Route path="/chat/room" element={<ChatRoomPage user={user} />} />
            <Route
              path="/price-alerts"
              element={<PriceAlertsPage user={user} />}
            />
            <Route path="/account" element={<AccountPage user={user} />}>
              <Route index element={<Navigate to="profile-edit" replace />} />
              <Route
                path="profile-edit"
                element={
                  <ProfileEditPage user={user} onUserUpdated={setUser} />
                }
              />
            </Route>
            <Route path="/login-success" element={<LoginSuccessPage />} />
          </Routes>
        )}
      </main>

      <Footer />

      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </div>
  );
}
