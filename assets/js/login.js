import { GATEWAY_URL } from './config.js';

const kakaoLoginBtn = document.getElementById('kakaoLoginBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const errorDiv = document.getElementById('error-message');

function goOAuth(provider) {
  errorDiv.textContent = '';
  window.location.href = `${GATEWAY_URL}/oauth2/authorization/${provider}`;
}

kakaoLoginBtn.addEventListener('click', (event) => {
  event.preventDefault();
  goOAuth('kakao');
});

googleLoginBtn.addEventListener('click', (event) => {
  event.preventDefault();
  goOAuth('google');
});
