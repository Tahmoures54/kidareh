import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest, ApiError } from "../utils/api";

/* ====================== TYPES ====================== */

export interface User {
  id: string | number;
  name?: string;
  phone?: string;
  role: "user" | "seller" | "admin";
  is_profile_complete?: boolean;
  email?: string;
  avatar_url?: string;
  [key: string]: any;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  refreshing: boolean;
  verifying: boolean;
  isAuthenticated: boolean;
  isSeller: boolean;
  isAdmin: boolean;
  sendOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, code: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

/* ====================== CONSTANTS ====================== */

const USER_CACHE_KEY = "kidareh_user_cache_v2";
const AUTH_CACHE_TTL = 5 * 60 * 1000; // ۵ دقیقه
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000;

/* ====================== HELPER FUNCTIONS ====================== */

function readUserCache(): User | null {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    if (!cached) return null;

    const { user, timestamp } = JSON.parse(cached);
    
    if (Date.now() - timestamp > AUTH_CACHE_TTL) {
      localStorage.removeItem(USER_CACHE_KEY);
      return null;
    }

    return user;
  } catch {
    localStorage.removeItem(USER_CACHE_KEY);
    return null;
  }
}

function writeUserCache(user: User | null): void {
  if (!user) {
    localStorage.removeItem(USER_CACHE_KEY);
    return;
  }
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify({ user, timestamp: Date.now() }));
  } catch (err) {
    console.error("Failed to write user cache:", err);
  }
}

// 🛡️ Pro Tip: پاکسازی کامل توکن‌ها برای امنیت
function clearTokens(): void {
  localStorage.removeItem("kidareh_token_v1");
  localStorage.removeItem("token");
}

async function retryRequest<T>(fn: () => Promise<T>, attempts = MAX_RETRY_ATTEMPTS, delay = RETRY_DELAY): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (attempts <= 1) throw err;
    if (err instanceof ApiError && err.status >= 400 && err.status < 500) throw err;

    await new Promise((resolve) => setTimeout(resolve, delay));
    return retryRequest(fn, attempts - 1, delay * 2);
  }
}

/* ====================== PROVIDER ====================== */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMountedRef = useRef(true);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);

  // 🚀 Pro Tip: گوش دادن به رویداد 401 از فایل api.ts
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      writeUserCache(null);
      clearTokens();
      // ریدایرکت سخت برای پاک شدن کامل مموری جاوااسکریپت
      window.location.href = "/login";
    };

    window.addEventListener("kidareh:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("kidareh:unauthorized", handleUnauthorized);
  }, []);

  // 🚀 Pro Tip: همگام‌سازی بین تب‌ها (Cross-Tab Synchronization)
  useEffect(() => {
    const syncAuth = (e: StorageEvent) => {
      if (e.key === USER_CACHE_KEY) {
        if (!e.newValue) {
          setUser(null);
          clearTokens();
        } else {
          try {
            setUser(JSON.parse(e.newValue).user);
          } catch {
            setUser(null);
          }
        }
      }
    };

    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const refreshMe = useCallback(async (): Promise<void> => {
    if (refreshPromiseRef.current) return refreshPromiseRef.current;

    const promise = (async () => {
      if (!isMountedRef.current) return;

      try {
        setRefreshing(true);
        const data = await retryRequest(() =>
          apiRequest<{ user: User } | User>("/api/auth/me", { method: "GET", auth: true })
        );

        if (!isMountedRef.current) return;

        const userData = (data as any)?.user ?? (data as User);

        if (userData && typeof userData === "object") {
          setUser(userData);
          writeUserCache(userData);
          setError(null);
        } else {
          throw new Error("Invalid user data received");
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setUser(null);
          writeUserCache(null);
          clearTokens();
        } else {
          const cachedUser = readUserCache();
          setUser(cachedUser ?? null);
        }
        setError(err instanceof ApiError ? err.message : "خطا در بارگذاری اطلاعات کاربر");
      } finally {
        if (isMountedRef.current) setRefreshing(false);
        refreshPromiseRef.current = null;
      }
    })();

    refreshPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const cachedUser = readUserCache();
        if (cachedUser && mounted) {
          setUser(cachedUser);
        }
        if (mounted) await refreshMe();
      } catch (err) {
        console.error("Initial auth load failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [refreshMe]);

  const sendOtp = useCallback(async (phone: string): Promise<void> => {
    if (!isMountedRef.current) return;
    setError(null);
    try {
      await apiRequest("/api/auth/send-otp", { method: "POST", body: { phone }, auth: false });
    } catch (err) {
      if (!isMountedRef.current) return;
      setError(err instanceof ApiError ? err.message : "خطا در ارسال کد تأیید. دوباره تلاش کنید.");
      throw err;
    }
  }, []);

  const verifyOtp = useCallback(async (phone: string, code: string): Promise<User> => {
    if (!isMountedRef.current) throw new Error("Component unmounted");
    setError(null);
    setVerifying(true);

    try {
      const data = await apiRequest<{ user?: User }>("/api/auth/verify-otp", {
        method: "POST",
        body: { phone, code },
        auth: false,
        credentials: "include",
      });

      if (!isMountedRef.current) throw new Error("Component unmounted");

      if (data?.user) {
        const userData = data.user;
        setUser(userData);
        writeUserCache(userData);
        return userData;
      }

      await refreshMe();
      return readUserCache() as User; // پس از رفرش باید کش موجود باشد
    } catch (err) {
      if (!isMountedRef.current) throw err;
      setError(err instanceof ApiError ? err.message : "کد وارد شده نادرست است. دوباره تلاش کنید.");
      throw err;
    } finally {
      if (isMountedRef.current) setVerifying(false);
    }
  }, [refreshMe]);

  const logout = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return;

    try {
      await apiRequest("/api/auth/logout", { method: "POST", auth: true, credentials: "include" });
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      if (isMountedRef.current) {
        setUser(null);
        writeUserCache(null);
        clearTokens(); // 🛡️ پاکسازی امنیتی
        setError(null);

        try {
          if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
          }
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      writeUserCache(updated);
      return updated;
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextType>(
    () => ({
      user, loading, isLoading: loading, refreshing, verifying,
      isAuthenticated: !!user,
      isSeller: user?.role === "seller" || user?.role === "admin",
      isAdmin: user?.role === "admin",
      sendOtp, verifyOtp, logout, refreshMe, updateUser, clearError, error,
    }),
    [user, loading, refreshing, verifying, sendOtp, verifyOtp, logout, refreshMe, updateUser, clearError, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth(redirectTo = "/login") {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, loading, navigate, redirectTo]);

  return { isAuthenticated, loading };
}

export function useRequireSeller(redirectTo = "/") {
  const { isSeller, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isSeller) {
      navigate(redirectTo, { replace: true });
    }
  }, [isSeller, loading, navigate, redirectTo]);

  return { isSeller, loading };
}
