"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { authService } from "@/src/services/auth/auth.service";
import { AuthResponse, AuthUser } from "@/src/types/auth";
import {
  clearStoredTokens,
  clearStoredUser,
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStoredUser,
} from "@/src/utils/storage";

interface AuthContextValue {
  user: AuthUser | null;
  isInitialized: boolean;
  isAuthenticated: boolean;
  loginWithAuthResponse: (payload: AuthResponse) => void;
  updateCurrentUser: (user: AuthUser) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storedUser = getStoredUser();
    const storedTokens = getStoredTokens();

    if (storedUser && storedTokens?.accessToken) {
      setUser(storedUser);
    }

    setIsInitialized(true);
  }, []);

  const loginWithAuthResponse = useCallback((payload: AuthResponse) => {
    setStoredTokens({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
    });
    setStoredUser(payload.user);
    setUser(payload.user);
  }, []);

  const updateCurrentUser = useCallback((nextUser: AuthUser) => {
    setStoredUser(nextUser);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    const tokens = getStoredTokens();

    try {
      if (tokens?.refreshToken) {
        await authService.logout({
          refreshToken: tokens.refreshToken,
        });
      }
    } catch {
      // Ignore network errors and force local logout.
    } finally {
      clearStoredTokens();
      clearStoredUser();
      setUser(null);
      router.replace("/login");
    }
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialized,
      isAuthenticated: Boolean(user),
      loginWithAuthResponse,
      updateCurrentUser,
      logout,
    }),
    [isInitialized, loginWithAuthResponse, logout, updateCurrentUser, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
