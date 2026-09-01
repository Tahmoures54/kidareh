import { useState, useEffect, useRef, useCallback } from "react";

interface DebounceOptions {
  /** تاخیر به میلی‌ثانیه */
  delay: number;
  /** اگر true باشد، بلافاصله در اولین فراخوانی مقدار را برگرداند (پیش‌فرض) */
  leading?: boolean;
  /** اگر true باشد، مقدار نهایی پس از تاخیر اعمال شود (پیش‌فرض true) */
  trailing?: boolean;
}

interface DebouncedState<T> {
  debouncedValue: T;
  /** لغو تایمر جاری */
  cancel: () => void;
  /** اعمال فوری مقدار و لغو تایمر */
  flush: () => void;
}

function useDebounce<T>(
  value: T,
  delay: number,
  options: DebounceOptions = {}
): DebouncedState<T> {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { leading = false, trailing = true } = options;

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const flush = useCallback(() => {
    cancel();
    setDebouncedValue(value);
  }, [cancel, value]);

  useEffect(() => {
    // اگر leading فعال باشد و قبلاً تایمری وجود نداشته باشد، مقدار را فوراً اعمال کن
    if (leading && timerRef.current === null) {
      setDebouncedValue(value);
      return;
    }

    // در غیر این صورت تایمر جدید تنظیم کن
    if (trailing) {
      timerRef.current = setTimeout(() => {
        setDebouncedValue(value);
        timerRef.current = null;
      }, delay);
    }

    // پاک‌سازی تایمر هنگام تغییر value یا delay یا unmount
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay, leading, trailing]);

  return { debouncedValue, cancel, flush };
}

export default useDebounce;
