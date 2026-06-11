import { useState } from 'react';
import Header from '@/components/Header/Header';
import LoginModal from '@/components/Modal/LoginModal';
import type { User } from '@/types/user';
import type { Notification } from '@/types/notification';

export default function App() {
  const [user, setUser] = useState<User | null>({
    id: 1,
    name: 'noah',
    email: 'noah0969@gmail.com',
    profileImageUrl: '',
  });

  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: 1,
      title: '새 댓글이 달렸습니다',
      message: '작성한 게시글에 댓글이 등록되었습니다.',
      link: '/posts/1',
      createdAt: '방금 전',
      read: false,
    },
    {
      id: 2,
      title: '채팅 메시지',
      message: '새로운 메시지가 도착했습니다.',
      link: '/chats/3',
      createdAt: '10분 전',
      read: false,
    },
    {
      id: 3,
      title: '프로필 업데이트',
      message: '프로필 정보를 최신 상태로 유지해 주세요.',
      link: '/profile',
      createdAt: '1시간 전',
      read: true,
    },
  ]);

  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  function handleOpenLoginModal() {
    setIsLoginModalOpen(true);
  }

  function handleCloseLoginModal() {
    setIsLoginModalOpen(false);
  }

  function handleLogout() {
    setUser(null);
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
        <h1>메인 페이지</h1>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </div>
  );
}