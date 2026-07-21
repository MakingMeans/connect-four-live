import type {
  AuthMessage,
  AuthTokensResponse,
  LoginInput,
  RegisterInput,
  UserProfile,
} from '../types/auth';
import { apiClient } from './api';

export const authService = {
  login(payload: LoginInput) {
    return apiClient.post<AuthTokensResponse>('/auth/login', payload, { auth: false });
  },

  register(payload: RegisterInput) {
    return apiClient.post<AuthMessage>('/auth/signup', payload, { auth: false });
  },

  getCurrentUser() {
    return apiClient.get<UserProfile>('/users/me');
  },
};
