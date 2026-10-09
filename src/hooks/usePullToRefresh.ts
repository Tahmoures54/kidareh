import { useCallback, useRef, useState, type TouchEventHandler } from "react";

export interface PullToRefreshOptions {
  /** فاصله لازم برای فعال شدن تازه‌سازی، بر حسب پیکسل */
  threshold?: number;
  /** حداکثر فاصله‌ای که نشانگر پایین می‌آید */
  maxPull?: number;
}

export interface PullToRefreshController {
  pullDistance: number;
  isRefreshing: boolean;
  threshold: number;
  onTouchStart: TouchEventHandler<HTMLDivElement>;
  onTouchMove: TouchEventHandler<HTMLDivElement>;
  onTouchEnd: TouchEventHandler<HTMLDivElement>;
}

/** فاصله نمایشی کشیدن را محدود می‌کند تا صفحه بیش از حد جابه‌جا نشود. */
export function calculatePullDistance(deltaY: number, maxPull = 88): number {
  return Math.max(0, Math.min(maxPull, deltaY * 0.55));
}

/** تازه‌سازی با کشیدن از بالای صفحه؛ بدون وابستگی خارجی و سازگار با موبایل. */
export function usePullToRefresh(
  onRefresh: () => Promise<unknown>,
  options: PullToRefreshOptions = {},
): PullToRefreshController {
  const threshold = options.threshold ?? 64;
  const maxPull = options.maxPull ?? 88;
  const startY = useRef<number | null>(null);
  const refreshingRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setIsRefreshing(true);
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(12);
      }
      await onRefresh();
    } finally {
      refreshingRef.current = false;
      setIsRefreshing(false);
      setPullDistance(0);
    }
  }, [onRefresh]);

  const onTouchStart: TouchEventHandler<HTMLDivElement> = useCallback((event) => {
    if (refreshingRef.current || event.touches.length !== 1) {
      startY.current = null;
      return;
    }

    const scrollTop = Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    );
    startY.current = scrollTop <= 0 ? event.touches[0].clientY : null;
  }, []);

  const onTouchMove: TouchEventHandler<HTMLDivElement> = useCallback((event) => {
    if (startY.current === null || refreshingRef.current || event.touches.length !== 1) return;
    const scrollTop = Math.max(
      window.scrollY,
      document.documentElement.scrollTop,
      document.body.scrollTop,
    );
    if (scrollTop > 0) {
      startY.current = null;
      setPullDistance(0);
      return;
    }

    const deltaY = event.touches[0].clientY - startY.current;
    setPullDistance(calculatePullDistance(deltaY, maxPull));
  }, [maxPull]);

  const onTouchEnd: TouchEventHandler<HTMLDivElement> = useCallback(() => {
    startY.current = null;
    if (pullDistance >= threshold) {
      void refresh();
      return;
    }
    setPullDistance(0);
  }, [pullDistance, refresh, threshold]);

  return { pullDistance, isRefreshing, threshold, onTouchStart, onTouchMove, onTouchEnd };
}
