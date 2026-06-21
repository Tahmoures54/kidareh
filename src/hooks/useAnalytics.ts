import { useCallback } from 'react';

interface AnalyticsEvent {
  category?: string;
  label?: string;
  value?: number;
  [key: string]: any;
}

export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: AnalyticsEvent) => {
    // Google Analytics 4
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, properties);
    }

    // Custom Analytics (if any)
    console.log('[Analytics]', eventName, properties);

    // Send to your backend
    if (process.env.NODE_ENV === 'production') {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: eventName, properties })
      }).catch(console.error);
    }
  }, []);

  const trackPageView = useCallback((pageName: string) => {
    trackEvent('page_view', { page_title: pageName });
  }, [trackEvent]);

  return { trackEvent, trackPageView };
}