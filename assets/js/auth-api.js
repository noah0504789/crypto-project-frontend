import { GATEWAY_URL, ROUTES } from './config.js';

const refreshPath = '/auth/refresh';
export const apiClient = axios.create({ withCredentials: true });

export const getAccessToken = () => sessionStorage.getItem('accessToken');
export const hasAccessToken = () => !!getAccessToken();
export const setAccessToken = (token) => sessionStorage.setItem('accessToken', token);
export const removeAccessToken = () => sessionStorage.removeItem('accessToken');

export function saveRedirectUrl() {
  sessionStorage.setItem('redirectAfterLogin', window.location.pathname + window.location.search);
}

export function consumeRedirectUrl() {
  const redirect = sessionStorage.getItem('redirectAfterLogin');
  if (redirect) sessionStorage.removeItem('redirectAfterLogin');
  return redirect;
}

function pickBearer(header) {
  return header && header.startsWith('Bearer ') ? header.slice(7) : null;
}

function redirectLoginPage() {
  window.location.replace(ROUTES.login);
}

let refreshPromise = null;

function refresh() {
  return axios
    .post(`${GATEWAY_URL}${refreshPath}`, {}, { withCredentials: true, validateStatus: (s) => s === 201 })
    .then((res) => {
      const authHeader = res.headers.authorization || res.headers.Authorization;
      const newAccessToken = pickBearer(authHeader);

      if (!newAccessToken) throw new Error('No Access Token in refresh response');

      setAccessToken(newAccessToken);
      return newAccessToken;
    });
}

function ensureRefresh() {
  return refreshPromise || (refreshPromise = refresh().finally(() => { refreshPromise = null; }));
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error?.response || error.response.status !== 401) return Promise.reject(error);

    const originalRequest = error.config;
    if (originalRequest?.url?.includes(refreshPath) || originalRequest._retry) {
      removeAccessToken();
      saveRedirectUrl();
      alert('⚠️ [세션 만료] 로그인이 필요합니다');
      redirectLoginPage();
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    return ensureRefresh()
      .then((newAccessToken) => {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      })
      .catch(() => {
        removeAccessToken();
        saveRedirectUrl();
        alert('⚠️ [세션 만료] 로그인이 필요합니다');
        redirectLoginPage();
        return Promise.reject(error);
      });
  },
);

// 기존 인라인 코드와 콘솔 테스트 호환용
window.apiClient = apiClient;
window.gateway = GATEWAY_URL;
window.getAT = getAccessToken;
window.hasAT = hasAccessToken;
window.setAT = setAccessToken;
