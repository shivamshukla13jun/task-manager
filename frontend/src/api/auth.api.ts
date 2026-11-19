import { api } from './client';
import type { ApiResponse, User } from '../types';
import type { LoginInput, RegisterInput } from '../schemas/auth.schema';

export interface AuthData {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const authApi = {
  login: async (input: LoginInput): Promise<AuthData> => {
    const { data } = await api.post<ApiResponse<AuthData>>('/api/auth/login', input);
    return data.data;
  },
  register: async (input: RegisterInput): Promise<User> => {
    const { data } = await api.post<ApiResponse<User>>('/api/auth/register', input);
    return data.data;
  },
  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout');
  },
};
