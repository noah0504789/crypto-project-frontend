import { apiClient } from '@/apis/apiClient';
import type { User, UserResponse } from '@/types/user';
import { mapUserResponseToUser } from '@/utils/userMapper';

type UpdateMyProfileRequest = {
  nickname: string;
};

let myProfileInFlight: Promise<User> | null = null;

export function getMyProfile(): Promise<User> {
  if (myProfileInFlight) {
    return myProfileInFlight;
  }

  myProfileInFlight = apiClient
    .get<UserResponse>('/user/me/profile')
    .then((response) => mapUserResponseToUser(response.data))
    .finally(() => {
      myProfileInFlight = null;
    });

  return myProfileInFlight;
}

export async function updateMyProfile(request: UpdateMyProfileRequest) {
  await apiClient.patch('/user/me/profile', request);
}

// 타 유저 프로필(GET /user/{userId}/profile). 백엔드 응답은 /user/me와 동일한 UserResponse.
// 채팅 아바타 등에서 반복 조회되므로 캐시 + in-flight 중복 요청 제거.
const userProfileCache = new Map<string, User>();
const userProfileInFlight = new Map<string, Promise<User>>();

export function getUserProfile(userId: string): Promise<User> {
  const cached = userProfileCache.get(userId);
  if (cached) {
    return Promise.resolve(cached);
  }

  const inFlight = userProfileInFlight.get(userId);
  if (inFlight) {
    return inFlight;
  }

  const request = apiClient
    .get<UserResponse>(`/user/${userId}/profile`)
    .then((response) => {
      const user = mapUserResponseToUser(response.data);
      userProfileCache.set(userId, user);
      return user;
    })
    .finally(() => {
      userProfileInFlight.delete(userId);
    });

  userProfileInFlight.set(userId, request);

  return request;
}
