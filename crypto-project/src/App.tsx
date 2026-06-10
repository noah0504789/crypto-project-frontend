import { useState } from 'react';
import Header from '@/components/Header/Header';
import LoginModal from '@/components/Modal/LoginModal';
import type { User } from '@/types/user';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(1);
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

  return (
    <div className='app'>
      <Header
        user={user}
        unreadNotificationCount={unreadNotificationCount}
        onLogin={handleOpenLoginModal}
        onLogout={handleLogout}
      />

      <main className='main'>
        <h1>메인 페이지</h1>
      </main>

      <LoginModal isOpen={isLoginModalOpen} onClose={handleCloseLoginModal} />
    </div>
  );
}