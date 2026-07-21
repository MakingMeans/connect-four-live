import { useEffect, useState, type PropsWithChildren } from 'react';

import { AuthContext } from './auth-context';
import { AUTH_EXPIRED_EVENT } from '../services/api';
import { authService } from '../services/authService';
import { tokenStorage } from '../services/tokenStorage';
import type { LoginInput, RegisterInput, UserProfile } from '../types/auth';

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrapAuth() {
      if (!tokenStorage.hasSession()) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const profile = await authService.getCurrentUser();
        if (isMounted) {
          setUser(profile);
        }
      } catch {
        tokenStorage.clearTokens();
        if (isMounted) {
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function handleAuthExpired() {
      tokenStorage.clearTokens();
      setUser(null);
      setIsLoading(false);
    }

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => {
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, []);

  async function login(payload: LoginInput) {
    const tokens = await authService.login(payload);
    tokenStorage.setTokens({
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
    });

    const profile = await authService.getCurrentUser();
    setUser(profile);
    return profile;
  }

  function register(payload: RegisterInput) {
    return authService.register(payload);
  }

  function logout() {
    tokenStorage.clearTokens();
    setUser(null);
  }

  async function refreshUser() {
    if (!tokenStorage.hasSession()) {
      setUser(null);
      return null;
    }

    try {
      const profile = await authService.getCurrentUser();
      setUser(profile);
      return profile;
    } catch {
      tokenStorage.clearTokens();
      setUser(null);
      return null;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
