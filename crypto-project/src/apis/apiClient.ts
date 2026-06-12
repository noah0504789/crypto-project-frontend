import axios from 'axios';
import { GATEWAY_URL } from '@/constants/api';
import { getAccessToken } from '@/utils/authStorage';

export const apiClient = axios.create({
  baseURL: GATEWAY_URL,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken();

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});