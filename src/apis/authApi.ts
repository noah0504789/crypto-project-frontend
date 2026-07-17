import { apiClient } from '@/apis/apiClient';
import { GATEWAY_URL } from '@/constants/api';

export type OAuthProvider = 'google' | 'kakao';

export function getOAuthLoginUrl(provider: OAuthProvider) {
  return `${GATEWAY_URL}/oauth2/authorization/${provider}`;
}

export async function logout() {
  await apiClient.post('/auth/logout');
}