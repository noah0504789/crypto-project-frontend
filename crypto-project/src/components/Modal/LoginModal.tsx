import googleLogo from '@/assets/google-logo.png';
import kakaoLogo from '@/assets/kakao-logo.png';
import { getOAuthLoginUrl } from '@/apis/authApi';
import './LoginModal.css';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  if (!isOpen) return null;

  return (
    <div className="login-modal-overlay" onClick={onClose}>
      <section className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="login-modal-close"
          onClick={onClose}
          aria-label="로그인 창 닫기"
        >
          ×
        </button>

        <div className="login-modal-header">
          <h2>로그인</h2>
          <p>소셜 계정으로 간편하게 시작하세요.</p>
        </div>

        <div className="oauth-login-list">
          <a
            className="oauth-login-button google"
            href={getOAuthLoginUrl('google')}
          >
            <span className="oauth-icon-box">
              <img src={googleLogo} alt="" className="oauth-logo" />
            </span>
            <span className="oauth-button-text">Google로 계속하기</span>
          </a>

          <a
            className="oauth-login-button kakao"
            href={getOAuthLoginUrl('kakao')}
          >
            <span className="oauth-icon-box">
              <img src={kakaoLogo} alt="" className="oauth-logo" />
            </span>
            <span className="oauth-button-text">카카오로 계속하기</span>
          </a>
        </div>

        <p className="login-modal-guide">
          로그인 시 서비스 이용약관 및 개인정보 처리방침에 동의한 것으로
          간주됩니다.
        </p>
      </section>
    </div>
  );
}