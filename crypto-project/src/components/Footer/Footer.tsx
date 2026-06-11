import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <p className="footer-copy">© 2026 Crypto Chat. All rights reserved.</p>

      <nav className="footer-links" aria-label="푸터 메뉴">
        <a href="/terms">이용약관</a>
        <a href="/privacy">개인정보처리방침</a>
        <a href="/contact">문의</a>
      </nav>
    </footer>
  );
}