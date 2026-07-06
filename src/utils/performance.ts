/**
 * Performance Monitoring & Optimization Utils
 * Instagram-level performance tracking
 */

import { useEffect, useRef, useState } from 'react';

/* ====================== TYPES ====================== */

export interface PerformanceMetrics {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
  FID: number; // First Input Delay
  INP: number; // Interaction to Next Paint
}

/* ====================== PERFORMANCE MONITORING ====================== */

/**
 * Report Core Web Vitals to analytics
 */
export function trackWebVitals(onMetric: (metric: any) => void) {
  if ('web-vital' in window === false) {
    console.warn('Web Vitals library not loaded');
    return;
  }

  // Using native Web Vitals API
  if ('PerformanceObserver' in window) {
    // Track Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if ((entry as any).hadRecentInput) continue; // Ignore user inputs
        onMetric({
          name: 'CLS',
          value: entry.value,
          rating: entry.value <= 0.1 ? 'good' : entry.value <= 0.25 ? 'needs-improvement' : 'poor'
        });
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Track Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((entryList) => {
      const lastEntry = entryList.getEntries().pop();
      if (lastEntry) {
        onMetric({
          name: 'LCP',
          value: lastEntry.renderTime || lastEntry.loadTime,
          rating: lastEntry.renderTime <= 2500 ? 'good' : lastEntry.renderTime <= 4000 ? 'needs-improvement' : 'poor'
        });
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Track First Input Delay
    const fidObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        onMetric({
          name: 'FID',
          value: (entry as any).processingDuration,
          rating: (entry as any).processingDuration <= 100 ? 'good' : (entry as any).processingDuration <= 300 ? 'needs-improvement' : 'poor'
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });
  }
}

/**
 * Image optimization - serve WebP with fallback
 */
export function getOptimizedImageSrc(src: string, width?: number): string {
  if (!src) return '';
  
  // If it's already a full URL
  if (src.startsWith('http')) {
    const url = new URL(src);
    // Add image optimization params
    url.searchParams.set('auto', 'format');
    url.searchParams.set('fit', 'max');
    if (width) url.searchParams.set('w', width.toString());
    return url.toString();
  }
  
  // Local image
  return src;
}

/**
 * Lazy load image with intersection observer
 */
export function useIntersectionObserver<T extends HTMLElement = HTMLDivElement>(
  options?: IntersectionObserverInit
) {
  const ref = useRef<T>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.unobserve(entry.target);
      }
    }, {
      rootMargin: '50px',
      ...options
    });

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [options]);

  return { ref, isVisible };
}

/**
 * Resource hints for optimization
 */
export function addResourceHints() {
  const link = document.createElement('link');
  link.rel = 'dns-prefetch';
  link.href = '//api.kidareh.com';
  document.head.appendChild(link);

  const link2 = document.createElement('link');
  link2.rel = 'preconnect';
  link2.href = 'https://fonts.googleapis.com';
  document.head.appendChild(link2);

  const link3 = document.createElement('link');
  link3.rel = 'preload';
  link3.as = 'style';
  link3.href = 'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;500;700;900&display=swap';
  document.head.appendChild(link3);
}

/**
 * Memory cleanup helper
 */
export function useMemoryCleanup(cleanup: () => void) {
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);
}

export default {
  trackWebVitals,
  getOptimizedImageSrc,
  useIntersectionObserver,
  addResourceHints,
  useMemoryCleanup
};
