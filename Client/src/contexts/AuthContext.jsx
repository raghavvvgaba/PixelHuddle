import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { BACKEND_URL as API_BASE_URL } from '../utils/backend';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to initialize auth state from localStorage
const getInitialAuthState = () => {
  try {
    const storedToken = localStorage.getItem('metameet-token');
    const storedUser = localStorage.getItem('metameet-user');
    
    if (storedToken && storedUser) {
      return {
        token: storedToken,
        user: JSON.parse(storedUser)
      };
    }
  } catch (error) {
    console.error('Error parsing stored user data:', error);
    localStorage.removeItem('metameet-token');
    localStorage.removeItem('metameet-user');
  }
  
  return {
    token: null,
    user: null
  };
};

export const AuthProvider = ({ children }) => {
  const initialState = getInitialAuthState();
  const [user, setUser] = useState(initialState.user);
  const [token, setToken] = useState(initialState.token);
  const [loading] = useState(false);

  // Set up axios interceptor for authenticated requests
  useEffect(() => {
    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          // Token expired or invalid
          logout('expired');
        } else if (error.response?.status === 404) {
          // User deleted from database
          logout('deleted');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        username,
        password
      });

      const { user: userData, token: authToken } = response.data;
      
      const mappedUser = {
        username: userData.username,
        email: userData.email
      };
      
      // Store in localStorage
      localStorage.setItem('metameet-token', authToken);
      localStorage.setItem('metameet-user', JSON.stringify(mappedUser));
      
      // Update state
      setToken(authToken);
      setUser(mappedUser);
      
      return { success: true, user: mappedUser };
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed';
      return { success: false, error: message };
    }
  };

  const signup = async (username, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/auth/signup`, {
        username,
        email,
        password
      });

      const { user: userData, token: authToken } = response.data;
      
      const mappedUser = {
        username: userData.username,
        email: userData.email
      };
      
      // Store token and user data for automatic login
      localStorage.setItem('metameet-token', authToken);
      localStorage.setItem('metameet-user', JSON.stringify(mappedUser));
      
      // Update state to log user in immediately
      setToken(authToken);
      setUser(mappedUser);
      
      return { success: true, user: mappedUser };
    } catch (error) {
      const message = error.response?.data?.error || 'Signup failed';
      return { success: false, error: message };
    }
  };

  const logout = (reason = 'manual') => {
    localStorage.removeItem('metameet-token');
    localStorage.removeItem('metameet-user');
    setToken(null);
    setUser(null);
    
    // Show appropriate message based on logout reason
    if (reason === 'deleted') {
      console.log('User was deleted from database - logging out');
      // You could also show a toast notification here
    } else if (reason === 'expired') {
      console.log('Session expired - please log in again');
      // You could also show a toast notification here
    }
  };

  const isTokenExpired = () => {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch {
      return true;
    }
  };

  const refreshToken = async () => {
    // This would implement token refresh logic if you had a refresh token endpoint
    // For now, just check if token is expired and logout if it is
    if (isTokenExpired()) {
      logout();
      return false;
    }
    return true;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !isTokenExpired(),
    login,
    signup,
    logout,
    refreshToken,
    isTokenExpired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
