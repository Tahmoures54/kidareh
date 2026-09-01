import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
  threshold?: number | number[];
  /** عنصر ریشه برای IntersectionObserver (پیش‌فرض: viewport) */
  root?: Element | null;
  /** اگر false باشد، مشاهده‌گر غیرفعال می‌شود */
  enabled?: boolean;
}

export const useInfiniteScroll = <T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "200px 0px",
  threshold = 0.1,
  root = null,
  enabled = true,
}: UseInfiniteScrollProps) => {
  const loadMoreRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // ذخیره آخرین مقادیر در ref برای جلوگیری از re-create شدن observer
  const stateRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage, enabled });

  // به‌روزرسانی stateRef بدون ایجاد رندر مجدد
  useEffect(() => {
    stateRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage, enabled };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, enabled]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    const { hasNextPage, isFetchingNextPage, fetchNextPage, enabled } = stateRef.current;

    if (enabled && target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, []); // وابستگی خالی؛ همیشه از stateRef استفاده می‌کند

  useEffect(() => {
    const currentElement = loadMoreRef.current;
    if (!currentElement || !enabled) {
      // اگر غیرفعال است یا عنصری وجود ندارد، observer قبلی را قطع می‌کنیم
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      return;
    }

    // قطع observer قبلی برای جلوگیری از نشت حافظه
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // ساخت observer جدید با تنظیمات جدید
    observerRef.current = new IntersectionObserver(handleObserver, {
      root,
      rootMargin,
      threshold,
    });

    observerRef.current.observe(currentElement);

    // پاک‌سازی هنگام unmount یا تغییر وابستگی‌ها
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, [handleObserver, rootMargin, threshold, root, enabled]);

  return loadMoreRef;
};
