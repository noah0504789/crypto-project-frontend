import { GATEWAY_URL, ROUTES } from './config.js';

const refreshPath = '/auth/refresh';

export const apiClient = axios.create({
  withCredentials: true,
});

export const getAccessToken = () => sessionStorage.getItem('accessToken');
export const hasAccessToken = () => !!getAccessToken();
export const setAccessToken = (token) => sessionStorage.setItem('accessToken', token);
export const removeAccessToken = () => sessionStorage.removeItem('accessToken');

export function saveRedirectUrl() {
  sessionStorage.setItem(
    'redirectAfterLogin',
    window.location.pathname + window.location.search,
  );
}

export function consumeRedirectUrl() {
  const redirect = sessionStorage.getItem('redirectAfterLogin');

  if (redirect) {
    sessionStorage.removeItem('redirectAfterLogin');
  }

  return redirect;
}

function pickBearer(header) {
  return header && header.startsWith('Bearer ') ? header.slice(7) : null;
}

function redirectLoginPage() {
  window.location.replace(ROUTES.login);
}

let refreshPromise = null;
let isRedirectingLogin = false;

function redirectLoginOnce() {
  if (isRedirectingLogin) return;

  isRedirectingLogin = true;

  removeAccessToken();
  saveRedirectUrl();
  alert('⚠️ [세션 만료] 로그인이 필요합니다');
  redirectLoginPage();
}

function refresh() {
  return axios
    .post(
      `${GATEWAY_URL}${refreshPath}`,
      {},
      {
        withCredentials: true,
        validateStatus: (status) => status === 201,
      },
    )
    .then((res) => {
      const authHeader = res.headers.authorization || res.headers.Authorization;
      const newAccessToken = pickBearer(authHeader);

      if (!newAccessToken) {
        throw new Error('No Access Token in refresh response');
      }

      setAccessToken(newAccessToken);

      return newAccessToken;
    });
}

function ensureRefresh() {
  if (refreshPromise) return refreshPromise;

  refreshPromise = refresh().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error?.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    const originalRequest = error.config;
    if (!originalRequest || originalRequest.url?.includes(refreshPath) || originalRequest._retry) {
      redirectLoginOnce();
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
        redirectLoginOnce();
        return Promise.reject(error);
      });
  },
);
