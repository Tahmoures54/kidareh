import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiRequest, ApiError } from "../utils/api";

interface User {
  id: number;
  name?: string;
  phone?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (payload: { phone: string; password: string }) => Promise<void>;
  register: (payload: Record<string, any>) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const me = await apiRequest<User>("/api/auth/me", { method: "GET", auth: true });
      setUser(me || null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
      } else {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshMe();
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [refreshMe]);

  const login = useCallback(async (payload: { phone: string; password: string }) => {
    const data = await apiRequest<{ token?: string; user?: User }, typeof payload>("/api/auth/login", {
      method: "POST",
      body: payload,
      auth: false,
    });

    if (data?.token) localStorage.setItem("token", data.token);
    if (data?.user) setUser(data.user);
    else await refreshMe();
  }, [refreshMe]);

  const register = useCallback(async (payload: Record<string, any>) => {
    const data = await apiRequest<{ token?: string; user?: User }, Record<string, any>>("/api/auth/register", {
      method: "POST",
      body: payload,
      auth: false,
    });

    if (data?.token) localStorage.setItem("token", data.token);
    if (data?.user) setUser(data.user);
    else await refreshMe();
  }, [refreshMe]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", auth: true });
    } catch {
      // ignore server logout error
    } finally {
      localStorage.removeItem("token");
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      refreshMe,
      setUser,
    }),
    [user, loading, login, register, logout, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}