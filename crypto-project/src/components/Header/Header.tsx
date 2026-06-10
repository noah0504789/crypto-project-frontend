import type { User } from "@/types/user";
import logoIcon from "@/assets/icon.png";
import "./Header.css";

type HeaderProps = {
  user: User | null;
  unreadNotificationCount: number;
  onLogin: () => void;
  onLogout: () => void;
};

export default function Header({
  user,
  unreadNotificationCount,
  onLogin,
  onLogout,
}: HeaderProps) {
  return (
    <header className="header">
      <div className="header-left">
        <a href="/" className="home-link" aria-label="홈으로 이동">
          <img src={logoIcon} alt="Home" className="home-logo" />
        </a>
      </div>

      <div className="header-right">
        {user ? (
          <div className="user-menu">
            <button
              type="button"
              className="notification-button"
              aria-label="알림"
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

            <a href="/profile" className="user-profile-link">
              {user.name}
            </a>

            <button type="button" className="header-button" onClick={onLogout}>
              로그아웃
            </button>
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
