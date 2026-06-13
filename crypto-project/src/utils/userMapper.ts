import type { User, UserResponse } from '@/types/user';

export function mapUserResponseToUser(response: UserResponse): User {
  return {
    id: response.id,
    name: response.nickname,
    email: response.email,
  };
}