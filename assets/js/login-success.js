import { GATEWAY_URL, ROUTES } from './config.js';
import { apiClient, consumeRedirectUrl, getAccessToken, removeAccessToken, setAccessToken } from './auth-api.js';

const logoutBtn = document.getElementById('logoutBtn');
const testApiBtn = document.getElementById('testApiBtn');
const topChatRoomBtn = document.getElementById('topChatRoomBtn');
const myChatRoomBtn = document.getElementById('myChatRoomBtn');
const createChatRoomBtn = document.getElementById('createChatRoomBtn');
const resultDiv = document.getElementById('api-result');

function initLoginSuccess() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('accessToken') || getAccessToken();

  if (!accessToken) {
    alert('로그인 실패: 토큰 없음');
    window.location.href = ROUTES.login;
    return;
  }

  setAccessToken(accessToken);

  const redirect = consumeRedirectUrl();
  if (redirect) {
    window.location.replace(redirect);
    return;
  }

  history.replaceState(null, '', ROUTES.loginSuccess);
}

initLoginSuccess();

logoutBtn.addEventListener('click', () => {
  const token = getAccessToken();
  if (!token) return alert('이미 로그아웃 상태입니다.');

  apiClient
    .post(`${GATEWAY_URL}/auth/logout`, null, { headers: { Authorization: `Bearer ${token}` } })
    .then(() => {
      removeAccessToken();
      sessionStorage.removeItem('redirectAfterLogin');
      alert('✅ 로그아웃 되었습니다');
      window.location.href = ROUTES.login;
    })
    .catch((err) => { resultDiv.textContent = `❌ 로그아웃 실패 ${err.message}`; });
});

testApiBtn.addEventListener('click', () => {
  apiClient
    .get(`${GATEWAY_URL}/user/me`)
    .then(({ data }) => { resultDiv.textContent = `✅ 응답: ${JSON.stringify(data)}`; })
    .catch(({ response }) => { resultDiv.textContent = `❌ ${JSON.stringify(response?.data ?? 'error')}`; });
});

topChatRoomBtn.addEventListener('click', () => { window.location.href = ROUTES.popularChatRooms; });
myChatRoomBtn.addEventListener('click', () => { window.location.href = ROUTES.myChatRooms; });
createChatRoomBtn.addEventListener('click', () => { window.location.href = ROUTES.createChatRoom; });
