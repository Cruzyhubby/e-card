import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, TOKEN_KEY, UNAUTHORIZED_EVENT, USER_KEY } from '../lib/api';

const AuthContext = createContext(null);

const readStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.role === 'usher' ? null : parsed;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    const handleUnauthorized = () => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setBooting(false);
      return undefined;
    }
    api.auth
      .me()
      .then((payload) => {
        if (!active) return;
        const nextUser = payload?.user ?? payload;
        if (nextUser?.role === 'usher') {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          setUser(null);
          return;
        }
        if (nextUser) {
          setUser(nextUser);
          localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
        }
      })
      .catch(() => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const result = await api.auth.login(email, password);

    if (result.user?.role === 'usher') {
      localStorage.setItem(TOKEN_KEY, result.token);
      try {
        await api.auth.logout();
      } catch (error) {
        // The token is discarded locally even if the revoke call fails.
      } finally {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      throw new Error(
        'This is an usher account. Sign in with the Éclat Gate scanner app on your phone — the web console is for organizers and admins.',
      );
    }

    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setUser(result.user);
    return result.user;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword, confirmation) => {
    const result = await api.auth.changePassword({
      current_password: currentPassword,
      password: newPassword,
      password_confirmation: confirmation,
    });
    const nextUser = result?.user ?? result;
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    }
    return nextUser;
  }, []);

  const updateAccount = useCallback(async (payload) => {
    const result = await api.auth.updateAccount(payload);
    const nextUser = result?.user ?? result;
    if (nextUser) {
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
      setUser(nextUser);
    }
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.auth.logout();
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      booting,
      isAuthenticated: Boolean(user),
      login,
      logout,
      changePassword,
      updateAccount,
    }),
    [user, booting, login, logout, changePassword, updateAccount],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
