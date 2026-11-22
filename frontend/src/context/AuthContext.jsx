import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/auth/me');
      if (res?.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
      setAuthError(null);
    } catch {
      // 401 or network unreachability in guest mode is expected
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    setAuthError(null);
    const res = await apiClient.post('/auth/login', { email, password });
    if (res?.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Login failed: invalid response from server.');
  };

  const signup = async (name, email, password) => {
    setAuthError(null);
    const res = await apiClient.post('/auth/signup', { name, email, password });
    if (res?.data?.user) {
      setUser(res.data.user);
      return res.data.user;
    }
    throw new Error('Registration failed: invalid response from server.');
  };

  const logout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    authError,
    login,
    signup,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}
