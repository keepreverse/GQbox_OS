import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@app-types';
import { useDevMode } from '@context/DevModeContext';

const TOKEN_KEY = 'gqbox_auth_token';

interface AuthLoginCredentials {
  login: string;
  password: string;
  remember?: boolean;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (credentials: AuthLoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

function saveToken(token: string | null, persistent = true): void {
  try {
    if (token) {
      if (persistent) {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
      }
    } else {
      localStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore quota / private mode
  }
}

export class AuthApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init);
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed.error || parsed.message) msg = parsed.error || parsed.message;
    } catch {
      // keep raw text
    }
    throw new AuthApiError(msg || `HTTP ${res.status}`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { devMode } = useDevMode();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const modeHeader = devMode ? 'dev' : 'demo';

  const authHeaders = useCallback(
    (withToken = true): Record<string, string> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-GQbox-Mode': modeHeader,
      };
      if (withToken) {
        const token = readToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
      return headers;
    },
    [modeHeader]
  );

  const fetchMe = useCallback(async () => {
    const token = readToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await api<{ user: User }>('/api/auth/me', {
        headers: authHeaders(true),
      });
      setUser(res.user ?? null);
    } catch {
      saveToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    setIsLoading(true);
    void fetchMe();
  }, [fetchMe]);

  const login = useCallback(
    async ({ login, password, remember = true }: AuthLoginCredentials) => {
      const res = await api<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        headers: authHeaders(false),
        body: JSON.stringify({ login, password }),
      });
      saveToken(res.token, remember);
      setUser(res.user);
    },
    [authHeaders]
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        headers: authHeaders(true),
      });
    } catch {
      // ignore logout errors
    } finally {
      saveToken(null);
      setUser(null);
    }
  }, [authHeaders]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
