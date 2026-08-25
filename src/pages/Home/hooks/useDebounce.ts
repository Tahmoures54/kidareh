import { useEffect, useRef, useCallback } from "react";

interface UseInfiniteScrollProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  rootMargin?: string;
  threshold?: number;
}

// اضافه شدن Generic <T> برای استفاده در div, span, ul و ...
export const useInfiniteScroll = <T extends HTMLElement = HTMLDivElement>({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  rootMargin = "200px 0px",
  threshold = 0.1,
}: UseInfiniteScrollProps) => {
  const loadMoreRef = useRef<T>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // تکنیک Pro: ذخیره Stateها در Ref برای جلوگیری از re-create شدن آبزرور
  const stateRef = useRef({ hasNextPage, isFetchingNextPage, fetchNextPage });
  
  // آپدیت کردن Ref بدون ایجاد رندر مجدد
  useEffect(() => {
    stateRef.current = { hasNextPage, isFetchingNextPage, fetchNextPage };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [target] = entries;
    const { hasNextPage, isFetchingNextPage, fetchNextPage } = stateRef.current;
    
    if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, []); // هیچ وابستگی ندارد، پس فقط یک بار در حافظه ساخته می‌شود!

  useEffect(() => {
    const currentElement = loadMoreRef.current;
    if (!currentElement) return;

    // استفاده از disconnect برای اطمینان از عدم Memory Leak
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(handleObserver, { 
      rootMargin, 
      threshold 
    });
    
    observerRef.current.observe(currentElement);

    // Cleanup Function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, rootMargin, threshold]);

  return loadMoreRef;
};
