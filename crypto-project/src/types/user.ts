export type User = {
  id: string;
  name: string;
  email?: string;
  profileImageUrl?: string;
};

export type UserResponse = {
  id: string;
  nickname: string;
  email: string;
  createdAt: string;
};