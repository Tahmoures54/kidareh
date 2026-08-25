/**
 * Analytics & Logging Utilities
 * Instagram-level analytics and error tracking
 */

/* ====================== EVENT LOGGING ====================== */

export interface AnalyticsEvent {
  name: string;
  category: string;
  label?: string;
  value?: number;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface ErrorLog {
  message: string;
  stack?: string;
  level: 'error' | 'warning' | 'info';
  timestamp: number;
  userId?: string;
  url?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

class Analytics {
  private sessionId: string;
  private userId: string | null = null;
  private queue: AnalyticsEvent[] = [];
  private batchSize = 10;
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.loadUserId();
    this.setupBeacon();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadUserId(): void {
    try {
      this.userId = localStorage.getItem('user_id');
    } catch {
      // Ignore errors
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
    try {
      localStorage.setItem('user_id', userId);
    } catch {
      // Ignore storage errors
    }
  }

  trackEvent(event: Omit<AnalyticsEvent, 'timestamp' | 'sessionId' | 'userId'>): void {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId || undefined,
    };

    this.queue.push(analyticsEvent);

    // Send batch if queue is full
    if (this.queue.length >= this.batchSize) {
      this.flushBatch();
    } else if (!this.batchTimeout) {
      // Schedule batch send in 5 seconds
      this.batchTimeout = setTimeout(() => this.flushBatch(), 5000);
    }
  }

  private flushBatch(): void {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);
    
    // Send to analytics endpoint
    navigator.sendBeacon(
      '/api/analytics/events',
      JSON.stringify(batch)
    );

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }

  private setupBeacon(): void {
    // Flush on page unload
    window.addEventListener('beforeunload', () => this.flushBatch());
    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flushBatch();
      }
    });
  }
}

class ErrorLogger {
  private queue: ErrorLog[] = [];
  private maxQueueSize = 50;

  logError(message: string, error?: Error, metadata?: Record<string, any>): void {
    const errorLog: ErrorLog = {
      message,
      stack: error?.stack,
      level: 'error',
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      metadata,
    };

    this.queue.push(errorLog);

    // Keep queue size limited
    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }

    // Send to error tracking service (e.g., Sentry)
    this.sendToErrorTracker(errorLog);
  }

  logWarning(message: string, metadata?: Record<string, any>): void {
    const warningLog: ErrorLog = {
      message,
      level: 'warning',
      timestamp: Date.now(),
      url: window.location.href,
      metadata,
    };

    this.queue.push(warningLog);
    console.warn(`[Warning] ${message}`, metadata);
  }

  logInfo(message: string, metadata?: Record<string, any>): void {
    const infoLog: ErrorLog = {
      message,
      level: 'info',
      timestamp: Date.now(),
      metadata,
    };

    console.log(`[Info] ${message}`, metadata);
  }

  private sendToErrorTracker(errorLog: ErrorLog): void {
    // Would integrate with Sentry, Rollbar, etc.
    navigator.sendBeacon(
      '/api/errors/log',
      JSON.stringify(errorLog)
    );
  }

  getErrorHistory(): ErrorLog[] {
    return [...this.queue];
  }
}

class PerformanceLogger {
  private marks: Map<string, number> = new Map();

  mark(name: string): void {
    if (window.performance?.mark) {
      window.performance.mark(name);
    }
    this.marks.set(name, Date.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    if (!this.marks.has(startMark)) {
      console.warn(`Start mark "${startMark}" not found`);
      return 0;
    }

    const startTime = this.marks.get(startMark)!;
    const endTime = this.marks.get(endMark || startMark) || Date.now();
    const duration = endTime - startTime;

    if (window.performance?.measure && endMark) {
      try {
        window.performance.measure(name, startMark, endMark);
      } catch {
        // Mark might not exist in performance API
      }
    }

    return duration;
  }

  logPageMetrics(): void {
    if (!window.performance?.timing) return;

    const timing = window.performance.timing;
    const metrics = {
      dns: timing.domainLookupEnd - timing.domainLookupStart,
      tcp: timing.connectEnd - timing.connectStart,
      ttfb: timing.responseStart - timing.requestStart,
      download: timing.responseEnd - timing.responseStart,
      domInteractive: timing.domInteractive - timing.responseEnd,
      domComplete: timing.domComplete - timing.domLoaded,
      loadComplete: timing.loadEventEnd - timing.loadEventStart,
      totalTime: timing.loadEventEnd - timing.fetchStart,
    };

    console.log('Page Performance Metrics:', metrics);
  }
}

// Singleton instances
export const analytics = new Analytics();
export const errorLogger = new ErrorLogger();
export const performanceLogger = new PerformanceLogger();

export default {
  analytics,
  errorLogger,
  performanceLogger,
  AnalyticsEvent,
  ErrorLog,
};
