import { useState } from "react";
import { Routes, Route, useNavigate, Navigate } from "react-router-dom";
import type { User } from "@/types/user";
import type { Notification, UpbitTickerAlertEvent } from "@/types/notification";
import { logout } from "@/apis/authApi";
import { mapUpbitTickerAlertToNotification } from "@/utils/notificationMapper";
import { removeAccessToken } from "@/utils/authStorage";
import Header from "@/components/Header/Header";
import LoginModal from "@/components/Modal/LoginModal";
import HomePage from "@/pages/HomePage";
import ChatPage from "@/pages/ChatPage";
import MyChatRoomPage from "@/pages/MyChatRoomPage";
import CreateChatRoomPage from "@/pages/CreateChatRoomPage";
import UpdateChatRoomPage from "@/pages/UpdateChatRoomPage";
import ChatRoomPage from "@/pages/ChatRoomPage";
import PriceAlertsPage from "@/pages/PriceAlertsPage";
import LoginSuccessPage from "@/pages/LoginSuccessPage";
import AccountPage from "@/pages/AccountPage/AccountPage";
import ProfileEditPage from "@/pages/ProfileEditPage/ProfileEditPage";
import Footer from "@/components/Footer/Footer";
import "./App.css";

export default function App() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>({
    id: "1",
    nickname: "noah",
    email: "noah0969@gmail.com",
    profileImageUrl: "",
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  function handleOpenLoginModal() {
    setIsLoginModalOpen(true);
  }

  function handleCloseLoginModal() {
    setIsLoginModalOpen(false);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch (error) {
      console.error("logout failed:", error);
      alert("로그아웃 처리 중 문제가 발생했습니다.");
    } finally {
      removeAccessToken();
      setUser(null);
      setNotifications([]);
      navigate("/", { replace: true });
    }
  }

  function handleReceiveUpbitTickerAlert(event: UpbitTickerAlertEvent) {
    const notification = mapUpbitTickerAlertToNotification(event);

    setNotifications((prevNotifications) => [
      notification,
      ...prevNotifications,
    ]);
  }

  function handleReadNotification(notificationId: number) {
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
  }

  function handleMockAlert() {
    handleReceiveUpbitTickerAlert({
      code: "KRW-BTC",
      price: 145_000_000,
      timestamp: Date.now(),
      avgInterval: 60,
      avgPrice: 142_000_000,
      changeRate: 0.021,
    });
  }

  return (
    <div className="app">
      <Header
        user={user}
        notifications={notifications}
        onReadNotification={handleReadNotification}
        onLogin={handleOpenLoginModal}
        onLogout={handleLogout}
      />

      <main className="main">
        <Routes>
          <Route
            path="/"
            element={<HomePage onMockAlert={handleMockAlert} />}
          />
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
              element={<ProfileEditPage user={user} onUserUpdated={setUser} />}
            />
          </Route>
          <Route path="/login-success" element={<LoginSuccessPage />} />
        </Routes>
      </main>

      <Footer />

      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </div>
  );
}
