// src/hooks/useStoreStats.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { apiRequest, ApiError } from "../utils/api";

/* ====================== TYPES ====================== */

interface StoreStatsState {
  storesCount: number | null;
  isLoading: boolean;
  error: string | null;
}

// نوع پاسخ سرور – ممکن است فروشگاه کاربر یا آمار کلی باشد
interface MyStoreResponse {
  id?: string | number;
  // سایر فیلدها در صورت وجود
  [key: string]: any;
}

/* ====================== CONSTANTS ====================== */

const STATS_CACHE_KEY = "kidareh_store_stats_cache_v1";
const STATS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/* ====================== UTILITY FUNCTIONS ====================== */

function readStatsCache(): number | null {
  if (typeof localStorage === "undefined") return null;

  try {
    const raw = localStorage.getItem(STATS_CACHE_KEY);
    if (!raw) return null;

    const { count, timestamp } = JSON.parse(raw);
    const isFresh = Date.now() - timestamp < STATS_CACHE_TTL;

    return isFresh ? count : null;
  } catch (error) {
    console.warn("Failed to read stats cache:", error);
    return null;
  }
}

function writeStatsCache(count: number): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(
      STATS_CACHE_KEY,
      JSON.stringify({
        count,
        timestamp: Date.now(),
      })
    );
  } catch (error) {
    console.warn("Failed to write stats cache:", error);
  }
}

function clearStatsCache(): void {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STATS_CACHE_KEY);
  }
}

/* ====================== HOOK ====================== */

export function useStoreStats(): StoreStatsState & { refresh: () => void } {
  const [state, setState] = useState<StoreStatsState>({
    storesCount: null,
    isLoading: true,
    error: null,
  });

  const isMountedRef = useRef<boolean>(true);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchStats = useCallback(async () => {
    // اگر درخواستی در حال انجام است، همان را برگردان
    if (fetchPromiseRef.current) {
      return fetchPromiseRef.current;
    }

    const promise = (async () => {
      // ابتدا کش
      const cachedCount = readStatsCache();
      if (cachedCount !== null && isMountedRef.current) {
        setState({
          storesCount: cachedCount,
          isLoading: false,
          error: null,
        });
        return; // اگر کش تازه بود، نیازی به fetch نیست
      }

      if (!isMountedRef.current) return;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        // استفاده از apiRequest برای مدیریت auth و خطاها
        // endpoint اصلاح شده به /api/stores/my/store (مطابق لاگ‌ها)
        const data = await apiRequest<MyStoreResponse>(
          "/api/stores/my/store",
          { method: "GET", auth: true }
        );

        if (!isMountedRef.current) return;

        // اگر پاسخ معتبر باشد (موفقیت‌آمیز) و فروشگاه موجود باشد
        // count = 1 یعنی فروشگاه موجود است
        const hasStore = data && (data.id !== undefined || Object.keys(data).length > 0);
        const count = hasStore ? 1 : 0;

        setState({
          storesCount: count,
          isLoading: false,
          error: null,
        });

        if (hasStore) {
          writeStatsCache(count);
        } else {
          // اگر فروشگاه وجود نداشت، کش را پاک کن
          clearStatsCache();
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;

        // خطای ۴۰۴ یعنی فروشگاهی وجود ندارد – طبیعی است
        if (err instanceof ApiError && err.status === 404) {
          setState({
            storesCount: 0,
            isLoading: false,
            error: null,
          });
          clearStatsCache();
          return;
        }

        // خطای ۴۰۱
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          setState({
            storesCount: null,
            isLoading: false,
            error: "لطفاً دوباره وارد شوید",
          });
          return;
        }

        const message =
          err instanceof ApiError
            ? err.message
            : err?.message || "خطا در دریافت اطلاعات فروشگاه";

        setState({
          storesCount: null,
          isLoading: false,
          error: message,
        });
      } finally {
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    ...state,
    refresh: () => {
      clearStatsCache();
      // لغو promise قبلی لازم نیست، اما می‌توان با abort پیاده‌سازی کرد
      // برای سادگی فقط ref را پاک می‌کنیم و دوباره fetch می‌کنیم
      fetchPromiseRef.current = null;
      setState({ storesCount: null, isLoading: true, error: null });
      fetchStats();
    },
  };
}