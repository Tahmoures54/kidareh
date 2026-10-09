import { useCallback, useRef, useState, type TouchEvent } from "react";
import { triggerHaptic } from "../utils/haptics";

interface PullToRefreshOptions {
  onRefresh: () => Promise<unknown> | unknown;
  enabled?: boolean;
  threshold?: number;
  maxPull?: number;
}

export function usePullToRefresh({
  onRefresh,
  enabled = true,
  threshold = 76,
  maxPull = 112,
}: PullToRefreshOptions) {
  const startY = useRef<number | null>(null);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const didHaptic = useRef(false);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!enabled || refreshing || window.scrollY > 0) return;
    startY.current = event.touches[0]?.clientY ?? null;
    didHaptic.current = false;
  }, [enabled, refreshing]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    if (!enabled || refreshing || startY.current === null || window.scrollY > 0) return;
    const currentY = event.touches[0]?.clientY;
    if (currentY === undefined) return;
    const distance = Math.max(0, Math.min(maxPull, currentY - startY.current));
    setPullDistance(distance);
    if (distance >= threshold && !didHaptic.current) {
      didHaptic.current = true;
      triggerHaptic("light");
    }
  }, [enabled, maxPull, refreshing, threshold]);

  const onTouchEnd = useCallback(async () => {
    const shouldRefresh = enabled && !refreshing && pullDistance >= threshold;
    startY.current = null;
    setPullDistance(0);
    if (!shouldRefresh) return;

    setRefreshing(true);
    triggerHaptic("medium");
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [enabled, onRefresh, pullDistance, refreshing, threshold]);

  return {
    pullDistance,
    refreshing,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  };
}
