import { createContext } from 'react';

import type { AuthMessage, LoginInput, RegisterInput, UserProfile } from '../types/auth';

export interface AuthContextValue {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginInput) => Promise<UserProfile>;
  register: (payload: RegisterInput) => Promise<AuthMessage>;
  logout: () => void;
  refreshUser: () => Promise<UserProfile | null>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
