import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import axios, { AxiosError } from 'axios';
import socket from '../socket';
import { BACKEND_URL as API_BASE_URL } from '../utils/backend';

export interface AuthUser {
  id: string;
  username: string;
  email: string;
}

interface AuthResult {
  success: boolean;
  user?: AuthUser;
  error?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  signup: (username: string, email: string, password: string) => Promise<AuthResult>;
  logout: (reason?: "manual" | "expired" | "deleted") => void;
  refreshToken: () => Promise<boolean>;
  isTokenExpired: () => boolean;
}

interface StoredAuthState {
  user: AuthUser | null;
  token: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const getInitialAuthState = (): StoredAuthState => {
  try {
    const storedToken = localStorage.getItem('metameet-token');
    const storedUser = localStorage.getItem('metameet-user');

    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser) as AuthUser,
      };
    }
  } catch (error) {
    console.error('Error parsing stored user data:', error);
  }

  localStorage.removeItem('metameet-token');
  localStorage.removeItem('metameet-user');
  return { token: null, user: null };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [initialState] = useState(getInitialAuthState);
  const [user, setUser] = useState(initialState.user);
  const [token, setToken] = useState(initialState.token);
  const [validatedToken, setValidatedToken] = useState<string | null>(null);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('metameet-token');
    localStorage.removeItem('metameet-user');
    setToken(null);
    setValidatedToken(null);
    setUser(null);
    socket.disconnect();
  }, []);

  const logout = useCallback((_reason: "manual" | "expired" | "deleted" = 'manual') => {
    clearAuth();
  }, [clearAuth]);

  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use((config) => {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          clearAuth();
        }
        return Promise.reject(error);
      },
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [clearAuth, token]);

  useEffect(() => {
    if (!token || validatedToken === token) return;

    let cancelled = false;

    axios.get<{ user: AuthUser }>(`${API_BASE_URL}/api/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      if (cancelled) return;

      localStorage.setItem('metameet-user', JSON.stringify(response.data.user));
      setUser(response.data.user);
      setValidatedToken(token);
    }).catch(() => {
      if (!cancelled) clearAuth();
    });

    return () => {
      cancelled = true;
    };
  }, [clearAuth, token, validatedToken]);

  const loading = Boolean(token && validatedToken !== token);
  const isAuthenticated = Boolean(token && validatedToken === token && user);

  useEffect(() => {
    if (!token || !isAuthenticated) {
      socket.disconnect();
      return;
    }

    socket.auth = { token };
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, token]);

  const storeSession = (nextUser: AuthUser, authToken: string) => {
    localStorage.setItem('metameet-token', authToken);
    localStorage.setItem('metameet-user', JSON.stringify(nextUser));
    setUser(nextUser);
    setToken(authToken);
    setValidatedToken(authToken);
  };

  const login = async (username: string, password: string): Promise<AuthResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, { username, password });
      const { user: userData, token: authToken } = response.data as { user: AuthUser; token: string };
      storeSession(userData, authToken);
      return { success: true, user: userData };
    } catch (error) {
      const message = (error as AxiosError<{ error?: string }>).response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const signup = async (username: string, email: string, password: string): Promise<AuthResult> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, { username, email, password });
      const { user: userData, token: authToken } = response.data as { user: AuthUser; token: string };
      storeSession(userData, authToken);
      return { success: true, user: userData };
    } catch (error) {
      const message = (error as AxiosError<{ error?: string }>).response?.data?.error || 'Signup failed';
      return { success: false, error: message };
    }
  };

  const isTokenExpired = () => {
    if (!token) return true;

    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) return true;
      const payload = JSON.parse(atob(encodedPayload)) as { exp?: number };
      return typeof payload.exp !== 'number' || payload.exp < Date.now() / 1000;
    } catch {
      return true;
    }
  };

  const refreshToken = async () => {
    if (isTokenExpired()) {
      clearAuth();
      return false;
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAuthenticated,
      login,
      signup,
      logout,
      refreshToken,
      isTokenExpired,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
