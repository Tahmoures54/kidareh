import { useCallback, useRef, useState, type TouchEventHandler } from "react";
import { hapticFeedback } from "../utils/haptics";

interface PullToRefreshOptions {
  onRefresh: () => Promise<unknown> | unknown;
  threshold?: number;
  enabled?: boolean;
}

interface PullToRefreshResult {
  refreshing: boolean;
  onTouchStart: TouchEventHandler<HTMLElement>;
  onTouchEnd: TouchEventHandler<HTMLElement>;
  onTouchCancel: TouchEventHandler<HTMLElement>;
}

/** Pull-to-refresh موبایل؛ فقط از بالای صفحه فعال می‌شود تا با اسکرول عادی تداخل نکند. */
export function usePullToRefresh({
  onRefresh,
  threshold = 76,
  enabled = true,
}: PullToRefreshOptions): PullToRefreshResult {
  const startY = useRef<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = useCallback<TouchEventHandler<HTMLElement>>((event) => {
    if (!enabled || refreshing || window.scrollY > 0) {
      startY.current = null;
      return;
    }
    startY.current = event.touches[0]?.clientY ?? null;
  }, [enabled, refreshing]);

  const onTouchEnd = useCallback<TouchEventHandler<HTMLElement>>(async (event) => {
    const start = startY.current;
    startY.current = null;
    const end = event.changedTouches[0]?.clientY;
    if (!enabled || refreshing || start === null || end === undefined) return;
    if (end - start < threshold || window.scrollY > 0) return;

    setRefreshing(true);
    hapticFeedback("light");
    try {
      await onRefresh();
    } catch {
      hapticFeedback("warning");
    } finally {
      setRefreshing(false);
    }
  }, [enabled, onRefresh, refreshing, threshold]);

  const onTouchCancel = useCallback<TouchEventHandler<HTMLElement>>(() => {
    startY.current = null;
  }, []);

  return { refreshing, onTouchStart, onTouchEnd, onTouchCancel };
}
