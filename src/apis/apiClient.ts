import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken, removeAccessToken, setAccessToken } from '@/utils/authStorage';

type RetryableAxiosRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

type ReissueAccessTokenResponse = {
  accessToken: string;
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
    const isReissueRequest = originalRequest.url?.includes('/auth/reissue');

    if (!isUnauthorized || isAlreadyRetried || isReissueRequest) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const response = await authClient.post<ReissueAccessTokenResponse>(
        '/auth/reissue',
      );

      const newAccessToken = response.data.accessToken;

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