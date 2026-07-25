import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { GATEWAY_URL } from '@/constants/api';
import {
  getAccessToken,
  removeAccessToken,
  saveRedirectAfterLogin,
  setAccessToken,
} from '@/utils/authStorage';

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

// 재발급까지 실패해 세션이 끝났음을 앱(React)에 알리는 이벤트.
// apiClient는 컴포넌트가 아니므로 window 이벤트로 App에 전달한다(App에서 로그아웃 + 로그인 유도).
export const AUTH_SESSION_EXPIRED_EVENT = 'auth:session-expired';

export const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL: GATEWAY_URL,
  withCredentials: true,
});

// 동시 401을 하나의 재발급 요청으로 합친다(single-flight).
let refreshPromise: Promise<string> | null = null;

async function requestNewAccessToken(): Promise<string> {
  // 백엔드(oauth2-client AuthController): POST /auth/refresh → 201,
  // 새 access token은 응답 body가 아니라 Authorization 헤더(Bearer)로 온다.
  const response = await authClient.post('/auth/refresh');

  const authHeader =
    response.headers['authorization'] ?? response.headers['Authorization'];
  const newAccessToken =
    typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;

  if (!newAccessToken) {
    throw new Error('No access token in /auth/refresh response');
  }

  setAccessToken(newAccessToken);

  return newAccessToken;
}

function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = requestNewAccessToken().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

function handleRefreshFailure() {
  removeAccessToken();
  saveRedirectAfterLogin(window.location.pathname + window.location.search);
  window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryableAxiosRequestConfig;

    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const isUnauthorized = error.response.status === 401;
    const isAlreadyRetried = originalRequest._retry === true;
    const isRefreshRequest = originalRequest.url?.includes('/auth/refresh');

    if (!isUnauthorized || isAlreadyRetried || isRefreshRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const newAccessToken = await refreshAccessTokenOnce();

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return apiClient(originalRequest);
    } catch (refreshError) {
      // 재발급 실패 → 토큰 제거 + 로그인 후 돌아올 경로 저장(실제 로그인 유도는 페이지 몫).
      handleRefreshFailure();
      return Promise.reject(refreshError);
    }
  },
);