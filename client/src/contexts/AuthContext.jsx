import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api, { setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const login = useCallback(async (emailOrUsername, password) => {
    const { data } = await api.post('/auth/login', { emailOrUsername, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    setAccessToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data;
  }, []);

  // Attempt silent refresh on load (refresh token lives in httpOnly cookie)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const me = await api.get('/auth/me');
        setUser(me.data.user);
      } catch (_e) {
        // no valid session
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
