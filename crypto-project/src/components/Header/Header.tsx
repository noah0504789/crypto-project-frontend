import { useEffect, useRef, useState } from "react";
import type { User } from "@/types/user";
import type { Notification } from "@/types/notification";
import logoIcon from "@/assets/icon.png";
import "./Header.css";

type HeaderProps = {
  user: User | null;
  notifications: Notification[];
  onReadNotification: (notificationId: number) => void;
  onLogin: () => void;
  onLogout: () => void;
};

export default function Header({
  user,
  notifications,
  onReadNotification,
  onLogin,
  onLogout,
}: HeaderProps) {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isNotificationMenuOpen, setIsNotificationMenuOpen] = useState(false);
  const notificationMenuRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const unreadNotificationCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      const isOutsideNotificationMenu =
        notificationMenuRef.current &&
        !notificationMenuRef.current.contains(target);
      const isOutsideProfileMenu =
        profileMenuRef.current && !profileMenuRef.current.contains(target);

      if (isOutsideNotificationMenu) {
        setIsNotificationMenuOpen(false);
      }

      if (isOutsideProfileMenu) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleToggleNotificationMenu() {
    setIsNotificationMenuOpen((prev) => !prev);
    setIsProfileMenuOpen(false);
  }

  function handleToggleProfileMenu() {
    setIsProfileMenuOpen((prev) => !prev);
    setIsNotificationMenuOpen(false);
  }

  function handleLogout() {
    setIsProfileMenuOpen(false);
    onLogout();
  }

  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="home-link" aria-label="홈으로 이동">
          <img src={logoIcon} alt="Home" className="home-logo" />
        </a>
      </div>

      <nav className="header-nav" aria-label="주요 메뉴">
        <a href="/chat" className="header-nav-link" aria-label="채팅으로 이동">
          <span className="header-nav-icon">💬</span>
          <span>채팅</span>
        </a>

        <a href="/price-alerts" className="header-nav-link" aria-label="가격 알림으로 이동">
          <span className="header-nav-icon">⏰</span>
          <span>가격 알림</span>
        </a>
      </nav>

      <div className="header-right">
        {user ? (
          <div className="user-menu">
            <div
              className="notification-menu-wrapper"
              ref={notificationMenuRef}
            >
              <button
                type="button"
                className="notification-button"
                aria-label="알림"
                onClick={handleToggleNotificationMenu}
              >
                <span className="notification-icon">🔔</span>

                {unreadNotificationCount > 0 && (
                  <span className="notification-badge">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
              </button>

              {isNotificationMenuOpen && (
                <div className="notification-dropdown">
                  <div className="notification-dropdown-header">
                    <strong>알림</strong>
                  </div>

                  {notifications.length > 0 ? (
                    <div className="notification-list">
                      {notifications.map((notification) => (
                        <a
                          key={notification.id}
                          href={notification.link}
                          className={`notification-item ${
                            notification.read ? "read" : "unread"
                          }`}
                          onClick={() => onReadNotification(notification.id)}
                        >
                          <div className="notification-item-content">
                            <div className="notification-item-title-row">
                              <strong>{notification.title}</strong>
                              {!notification.read && (
                                <span className="notification-unread-dot" />
                              )}
                            </div>

                            <p>{notification.message}</p>
                            <span className="notification-time">
                              {notification.createdAt}
                            </span>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className="notification-empty">새 알림이 없습니다.</p>
                  )}
                </div>
              )}
            </div>

            <div className="profile-menu-wrapper" ref={profileMenuRef}>
              <button
                type="button"
                className="profile-button"
                onClick={handleToggleProfileMenu}
                aria-label="프로필 메뉴 열기"
              >
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.name}
                    className="profile-image"
                  />
                ) : (
                  <span className="profile-fallback">
                    {user.name.charAt(0)}
                  </span>
                )}
              </button>

              {isProfileMenuOpen && (
                <div className="profile-dropdown">
                  <div className="profile-dropdown-user">
                    <div className="profile-dropdown-avatar">
                      {user.profileImageUrl ? (
                        <img src={user.profileImageUrl} alt={user.name} />
                      ) : (
                        <span>{user.name.charAt(0)}</span>
                      )}
                    </div>

                    <div className="profile-dropdown-info">
                      <strong>{user.name}</strong>
                      {user.email && <span>{user.email}</span>}
                    </div>
                  </div>

                  <div className="profile-dropdown-divider" />

                  <a href="/profile" className="profile-dropdown-item">
                    프로필 수정
                  </a>

                  <button
                    type="button"
                    className="profile-dropdown-item logout"
                    onClick={handleLogout}
                  >
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <button type="button" className="header-button" onClick={onLogin}>
            로그인
          </button>
        )}
      </div>
    </header>
  );
}
