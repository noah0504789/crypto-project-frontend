import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken, removeAccessToken, setAccessToken } from '@/utils/authStorage';

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

export const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  withCredentials: true,
});

const authClient = axios.create({
  baseURL: GATEWAY_URL,
  withCredentials: true,
});

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
        removeAccessToken();
        return Promise.reject(error);
      }

      setAccessToken(newAccessToken);

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newAccessToken}`,
      };

      return apiClient(originalRequest);
    } catch (reissueError) {
      removeAccessToken();
      return Promise.reject(reissueError);
    }
  },
);