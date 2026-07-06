/**
 * Advanced API Service Layer
 * Instagram-level API abstraction with interceptors, caching, and retry logic
 */

import { ENV, getApiUrl } from './env';
import { errorLogger, analytics } from '../utils/analytics';

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
  requiresAuth?: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
  timestamp: number;
}

class ApiService {
  private cache: Map<string, { data: any; expiry: number }> = new Map();
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: any) => any> = [];
  private errorInterceptors: Array<(error: Error) => Promise<any>> = [];

  /**
   * Add request interceptor
   */
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   */
  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Add error interceptor
   */
  addErrorInterceptor(interceptor: (error: Error) => Promise<any>): void {
    this.errorInterceptors.push(interceptor);
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('POST', endpoint, data, config);
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', endpoint, data, config);
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }

  /**
   * Core request method
   */
  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    // Apply default config
    const finalConfig: RequestConfig = {
      timeout: ENV.API_TIMEOUT,
      retries: 3,
      cache: method === 'GET',
      cacheTTL: ENV.CACHE_TTL,
      requiresAuth: true,
      ...config,
    };

    // Apply request interceptors
    for (const interceptor of this.requestInterceptors) {
      Object.assign(finalConfig, interceptor(finalConfig));
    }

    // Check cache for GET requests
    if (method === 'GET' && finalConfig.cache) {
      const cached = this.getFromCache(endpoint);
      if (cached) {
        analytics.trackEvent({
          name: 'api_cache_hit',
          category: 'api',
          label: endpoint,
          metadata: { method },
        });
        return cached;
      }
    }

    // Execute request with retries
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= (finalConfig.retries || 0); attempt++) {
      try {
        const response = await this.fetchWithTimeout(
          method,
          endpoint,
          data,
          finalConfig
        );

        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = interceptor(finalResponse);
        }

        // Cache successful GET responses
        if (method === 'GET' && finalConfig.cache && finalResponse.success) {
          this.setCache(endpoint, finalResponse, finalConfig.cacheTTL || ENV.CACHE_TTL);
        }

        // Log success
        analytics.trackEvent({
          name: 'api_success',
          category: 'api',
          label: endpoint,
          metadata: { method, attempt, dataSize: JSON.stringify(data).length },
        });

        return finalResponse;
      } catch (error) {
        lastError = error as Error;

        if (attempt < (finalConfig.retries || 0)) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Handle error
    const finalError = lastError || new Error('Unknown API error');
    
    // Apply error interceptors
    for (const interceptor of this.errorInterceptors) {
      try {
        await interceptor(finalError);
      } catch {
        // Ignore interceptor errors
      }
    }

    // Log error
    errorLogger.logError(`API Error: ${method} ${endpoint}`, finalError, {
      endpoint,
      method,
      retries: finalConfig.retries,
    });

    analytics.trackEvent({
      name: 'api_error',
      category: 'api',
      label: endpoint,
      metadata: { method, error: finalError.message },
    });

    return {
      success: false,
      error: finalError.message,
      code: 500,
      timestamp: Date.now(),
    };
  }

  /**
   * Fetch with timeout
   */
  private async fetchWithTimeout(
    method: string,
    endpoint: string,
    data?: any,
    config?: RequestConfig
  ): Promise<ApiResponse> {
    const controller = new AbortController();
    const timeout = config?.timeout || ENV.API_TIMEOUT;
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const url = getApiUrl(endpoint);
      const headers = this.buildHeaders(config);

      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        signal: controller.signal,
      });

      const json = await response.json();

      if (!response.ok) {
        throw new Error(json.error || `HTTP ${response.status}`);
      }

      return {
        ...json,
        timestamp: Date.now(),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Build request headers
   */
  private buildHeaders(config?: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Client-Version': ENV.APP_VERSION,
      'X-Client-Timestamp': Date.now().toString(),
    };

    // Add auth token
    if (config?.requiresAuth !== false) {
      const token = localStorage.getItem(ENV.AUTH_TOKEN_KEY);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    // Merge custom headers
    if (config?.headers) {
      Object.assign(headers, config.headers);
    }

    return headers;
  }

  /**
   * Cache management
   */
  private getFromCache<T = any>(key: string): ApiResponse<T> | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache<T = any>(key: string, data: ApiResponse<T>, ttl: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const apiService = new ApiService();

// Add default error interceptor for 401 (unauthorized)
apiService.addErrorInterceptor(async (error) => {
  if (error.message.includes('401') || error.message.includes('Unauthorized')) {
    // Clear auth token and redirect to login
    localStorage.removeItem(ENV.AUTH_TOKEN_KEY);
    window.location.href = '/login';
  }
});

export default apiService;
