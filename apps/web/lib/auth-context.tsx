'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, refreshToken as apiRefresh, AuthError } from './api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

const TOKEN_KEY = 'citesight_access_token';
const REFRESH_KEY = 'citesight_refresh_token';
const USER_KEY = 'citesight_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setAccessToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
    // Navigate to login — works in any client component context
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = localStorage.getItem(USER_KEY);
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedRefresh = localStorage.getItem(REFRESH_KEY);

        if (!storedUser || !storedToken || !storedRefresh) {
          setLoading(false);
          return;
        }

        const parsedUser = JSON.parse(storedUser) as User;
        setUser(parsedUser);

        try {
          // Refresh immediately to avoid using stale access tokens after reloads
          const tokens = await apiRefresh(storedRefresh);
          setAccessToken(tokens.accessToken);
          localStorage.setItem(TOKEN_KEY, tokens.accessToken);
          localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
        } catch (err) {
          if (err instanceof AuthError) {
            // Token is genuinely expired/invalid — clear session
            logout();
            return;
          }
          // Network error or server hiccup — keep user logged in with stored token
          setAccessToken(storedToken);
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    void init();
  }, [logout]);

  const persist = useCallback((u: User, tokens: { accessToken: string; refreshToken: string }) => {
    setUser(u);
    setAccessToken(tokens.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe?: boolean) => {
    const res = await apiLogin(email, password, rememberMe);
    persist(res.user, res.tokens);
  }, [persist]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await apiRegister(email, password, name);
    persist(res.user, res.tokens);
  }, [persist]);

  // Silent token refresh
  useEffect(() => {
    if (!accessToken) return;
    const interval = setInterval(async () => {
      const rt = localStorage.getItem(REFRESH_KEY);
      if (!rt) return;
      try {
        const tokens = await apiRefresh(rt);
        setAccessToken(tokens.accessToken);
        localStorage.setItem(TOKEN_KEY, tokens.accessToken);
        localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
      } catch {
        logout();
      }
    }, 10 * 60 * 1000); // refresh every 10 min
    return () => clearInterval(interval);
  }, [accessToken, logout]);

  return (
    <AuthContext.Provider value={{ user, accessToken, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
