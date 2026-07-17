import type { User, UserResponse } from "@/types/user";

export function mapUserResponseToUser(response: UserResponse): User {
  return {
    id: response.id,
    nickname: response.nickname,
    email: response.email,
  };
}
