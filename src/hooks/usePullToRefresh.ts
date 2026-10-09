import { useCallback, useRef, useState, type TouchEventHandler } from "react";

interface PullToRefreshOptions {
  onRefresh: () => Promise<unknown> | unknown;
  threshold?: number;
  maxPull?: number;
}

interface PullToRefreshResult {
  pullDistance: number;
  isRefreshing: boolean;
  onTouchStart: TouchEventHandler<HTMLElement>;
  onTouchMove: TouchEventHandler<HTMLElement>;
  onTouchEnd: TouchEventHandler<HTMLElement>;
}

/** کشیدن صفحه از بالای viewport برای تازه‌سازی؛ بدون مسدودکردن اسکرول عادی. */
export function usePullToRefresh({
  onRefresh,
  threshold = 64,
  maxPull = 88,
}: PullToRefreshOptions): PullToRefreshResult {
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);
  const busyRef = useRef(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const resetPull = useCallback(() => {
    pullRef.current = 0;
    setPullDistance(0);
    startY.current = null;
  }, []);

  const onTouchStart: TouchEventHandler<HTMLElement> = useCallback((event) => {
    if (busyRef.current || window.scrollY > 2 || event.touches.length !== 1) {
      startY.current = null;
      return;
    }
    startY.current = event.touches[0]?.clientY ?? null;
  }, []);

  const onTouchMove: TouchEventHandler<HTMLElement> = useCallback((event) => {
    if (startY.current === null || busyRef.current || window.scrollY > 2) return;
    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) return;
    const delta = Math.max(0, currentY - startY.current);
    const eased = Math.min(maxPull, Math.round(delta * 0.58));
    pullRef.current = eased;
    setPullDistance(eased);
  }, [maxPull]);

  const onTouchEnd: TouchEventHandler<HTMLElement> = useCallback(async () => {
    const shouldRefresh = pullRef.current >= threshold && !busyRef.current;
    startY.current = null;
    if (!shouldRefresh) {
      resetPull();
      return;
    }

    busyRef.current = true;
    setIsRefreshing(true);
    setPullDistance(48);
    try {
      await onRefresh();
    } finally {
      busyRef.current = false;
      setIsRefreshing(false);
      resetPull();
    }
  }, [onRefresh, resetPull, threshold]);

  return { pullDistance, isRefreshing, onTouchStart, onTouchMove, onTouchEnd };
}
