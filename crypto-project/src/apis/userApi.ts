import { apiClient } from '@/apis/apiClient';
import type { UserResponse } from '@/types/user';
import { mapUserResponseToUser } from '@/utils/userMapper'

type UpdateMyProfileRequest = {
  nickname: string;
};

export async function getMyProfile() {
  const response = await apiClient.get<UserResponse>('/user/me');

  return mapUserResponseToUser(response.data);
}

export async function updateMyProfile(request: UpdateMyProfileRequest) {
  await apiClient.patch('/user/me', request);

  return getMyProfile();
}