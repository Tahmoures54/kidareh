// src/utils/api.ts
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  auth?: boolean;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

const DEFAULT_TIMEOUT = 20000;

const getBaseUrl = () => {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return envBase || window.location.origin;
};

const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, "");
const normalizePath = (p: string) => (p.startsWith("/") ? p : `/${p}`);

const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Request timeout")), timeoutMs);
    promise
      .then((r) => {
        clearTimeout(t);
        resolve(r);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });

function readToken(): string {
  return (
    localStorage.getItem("kidareh_token_v1") ||
    localStorage.getItem("token") ||
    ""
  );
}

export async function apiRequest<TResponse = any, TBody = unknown>(
  path: string,
  options: ApiRequestOptions<TBody> = {}
): Promise<TResponse> {
  const {
    method = "GET",
    body,
    headers = {},
    timeoutMs = DEFAULT_TIMEOUT,
    credentials = "include",
    signal,
    auth = true,
  } = options;

  const base = normalizeBaseUrl(getBaseUrl());
  const url = `${base}${normalizePath(path)}`;

  const token = readToken();

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth && token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;

  try {
    res = await withTimeout(
      fetch(url, {
        method,
        credentials,
        headers: mergedHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal,
        cache: "no-store", // ✅ جلوگیری از کش 304 برای دیتای داینامیک مثل نشان‌ها و کیف پول
      }),
      timeoutMs
    );
  } catch (e: any) {
    throw e;
  }

  // ✅ مدیریت ایمن خواندن بدنه پاسخ (جلوگیری از ارور بدنه خالی در 204 یا 304)
  let data: any = null;
  const status = res.status;
  
  // اگر پاسخ 204 (No Content) یا 304 باشد، بدنه‌ای برای خواندن وجود ندارد
  if (status !== 204 && status !== 304) {
    try {
      const text = await res.text();
      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      // پاسخ غیر JSON
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

// ✅ شیء api برای سازگاری با کدهای قدیمی و هوک‌ها
export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<ApiRequestOptions, "method" | "body">
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};