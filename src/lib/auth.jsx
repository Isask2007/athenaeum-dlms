import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearToken, getToken, setToken } from './api.js';

const AuthContext = createContext(null);

export const DEMO_ACCOUNTS = [
  { role: 'admin', label: 'Administrator', email: 'admin@athenaeum.edu', password: 'Admin@1234' },
  { role: 'librarian', label: 'Librarian', email: 'librarian@athenaeum.edu', password: 'Librarian@1234' },
  { role: 'member', label: 'Member', email: 'member@athenaeum.edu', password: 'Member@1234' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.get('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    isStaff: user?.role === 'admin' || user?.role === 'librarian',
    async login(email, password) {
      const data = await api.post('/auth/login', { email, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      const data = await api.post('/auth/register', payload);
      setToken(data.token);
      setUser(data.user);
      return data.user;
    },
    logout() {
      clearToken();
      setUser(null);
    },
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
};
