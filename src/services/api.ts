/**
 * Advanced API Service Layer — cookie-only auth (no localStorage tokens)
 */

import { ENV, getApiUrl } from "../config/env";
import { errorLogger, analytics } from "../utils/analytics";

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

  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: (response: any) => any): void {
    this.responseInterceptors.push(interceptor);
  }

  addErrorInterceptor(interceptor: (error: Error) => Promise<any>): void {
    this.errorInterceptors.push(interceptor);
  }

  async get<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>("GET", endpoint, undefined, config);
  }

  async post<T = any>(endpoint: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>("POST", endpoint, data, config);
  }

  async put<T = any>(endpoint: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>("PUT", endpoint, data, config);
  }

  async patch<T = any>(endpoint: string, data: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>("PATCH", endpoint, data, config);
  }

  async delete<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    return this.request<T>("DELETE", endpoint, undefined, config);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const finalConfig: RequestConfig = {
      timeout: ENV.API_TIMEOUT,
      retries: 3,
      cache: method === "GET" && config.requiresAuth === false,
      cacheTTL: ENV.CACHE_TTL,
      requiresAuth: true,
      ...config,
    };

    for (const interceptor of this.requestInterceptors) {
      Object.assign(finalConfig, interceptor(finalConfig));
    }

    if (method === "GET" && finalConfig.cache && finalConfig.requiresAuth === false) {
      const cached = this.getFromCache(endpoint);
      if (cached) {
        analytics.trackEvent({
          name: "api_cache_hit",
          category: "api",
          label: endpoint,
          metadata: { method },
        });
        return cached;
      }
    }

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= (finalConfig.retries || 0); attempt++) {
      try {
        const response = await this.fetchWithTimeout(method, endpoint, data, finalConfig);
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = interceptor(finalResponse);
        }
        if (method === "GET" && finalConfig.cache && finalConfig.requiresAuth === false && finalResponse.success) {
          this.setCache(endpoint, finalResponse, finalConfig.cacheTTL || ENV.CACHE_TTL);
        }
        analytics.trackEvent({
          name: "api_success",
          category: "api",
          label: endpoint,
          metadata: { method, attempt },
        });
        return finalResponse;
      } catch (error) {
        lastError = error as Error;
        if (attempt < (finalConfig.retries || 0)) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    const finalError = lastError || new Error("Unknown API error");
    for (const interceptor of this.errorInterceptors) {
      try {
        await interceptor(finalError);
      } catch {
        // ignore
      }
    }

    errorLogger.logError(`API Error: ${method} ${endpoint}`, finalError, {
      endpoint,
      method,
      retries: finalConfig.retries,
    });

    analytics.trackEvent({
      name: "api_error",
      category: "api",
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
        credentials: "include",
        cache: "no-store",
      });

      const json = await response.json().catch(() => ({}));

      if (response.status === 401) {
        window.dispatchEvent(new CustomEvent("kidareh:unauthorized"));
      }

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

  private buildHeaders(config?: RequestConfig): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Client-Version": ENV.APP_VERSION,
      "X-Client-Timestamp": Date.now().toString(),
    };
    // Auth is HttpOnly cookie only — never attach Bearer from storage
    if (config?.headers) Object.assign(headers, config.headers);
    return headers;
  }

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
    this.cache.set(key, { data, expiry: Date.now() + ttl });
  }

  clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    const regex = new RegExp(pattern);
    for (const [key] of this.cache) {
      if (regex.test(key)) this.cache.delete(key);
    }
  }

  getCacheStats() {
    return { size: this.cache.size, keys: Array.from(this.cache.keys()) };
  }
}

export const apiService = new ApiService();

apiService.addErrorInterceptor(async (error) => {
  if (error.message.includes("401") || error.message.includes("Unauthorized")) {
    window.dispatchEvent(new CustomEvent("kidareh:unauthorized"));
  }
});

export default apiService;
