/**
 * Advanced React Hooks for Performance & UX
 * Instagram-level patterns
 */

import { useCallback, useEffect, useRef, useState, useReducer, Dispatch, SetStateAction } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorLogger } from '../utils/analytics';

/* ====================== useAsync HOOK ====================== */

interface AsyncState<T> {
  status: 'idle' | 'pending' | 'success' | 'error';
  data: T | null;
  error: Error | null;
}

export function useAsync<T>(
  asyncFunction: () => Promise<T>,
  immediate = true,
  dependencies?: any[]
) {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const execute = useCallback(async () => {
    setState({ status: 'pending', data: null, error: null });
    try {
      const response = await asyncFunction();
      setState({ status: 'success', data: response, error: null });
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ status: 'error', data: null, error: err });
      errorLogger.logError('useAsync error', err);
      throw err;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, dependencies ? [...dependencies] : [execute, immediate]);

  return { ...state, execute };
}

/* ====================== usePrevious HOOK ====================== */

export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

/* ====================== useDebounce HOOK ====================== */

export function useDebounce<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

/* ====================== useThrottle HOOK ====================== */

export function useThrottle<T>(value: T, interval = 500): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= interval) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, interval - (Date.now() - lastRan.current));

    return () => clearTimeout(handler);
  }, [value, interval]);

  return throttledValue;
}

/* ====================== useLocalStorage HOOK ====================== */

export function useLocalStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      errorLogger.logError('useLocalStorage read error', error as Error);
      return initialValue;
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      errorLogger.logError('useLocalStorage write error', error as Error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/* ====================== useSessionStorage HOOK ====================== */

export function useSessionStorage<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      errorLogger.logError('useSessionStorage read error', error as Error);
      return initialValue;
    }
  });

  const setValue: Dispatch<SetStateAction<T>> = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      errorLogger.logError('useSessionStorage write error', error as Error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue];
}

/* ====================== useMount HOOK ====================== */

export function useMount(callback: () => void): void {
  useEffect(() => {
    callback();
  }, []);
}

/* ====================== useUnmount HOOK ====================== */

export function useUnmount(callback: () => void): void {
  useEffect(() => {
    return () => callback();
  }, []);
}

/* ====================== usePrevious HOOK ====================== */

export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/* ====================== useNetworkStatus HOOK ====================== */

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/* ====================== useReducerWithLogger HOOK ====================== */

export function useReducerWithLogger<S, A>(
  reducer: (state: S, action: A) => S,
  initialState: S,
  actionName?: string
) {
  return useReducer((state: S, action: A) => {
    if (process.env.NODE_ENV === 'development' && actionName) {
      console.log(`[${actionName}]`, action, state);
    }
    return reducer(state, action);
  }, initialState);
}

export default {
  useAsync,
  usePrevious,
  useDebounce,
  useThrottle,
  useLocalStorage,
  useSessionStorage,
  useMount,
  useUnmount,
  useWindowSize,
  useNetworkStatus,
  useReducerWithLogger,
};
