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

  const url = `${getBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  const token = localStorage.getItem("token") || "";

  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (auth && token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await withTimeout(
    fetch(url, {
      method,
      credentials,
      headers: mergedHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    }),
    timeoutMs
  );

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // non-json
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `HTTP ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

// ✅ شیء api برای سازگاری با کدهای قدیمی
export const api = {
  get: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "POST", body }),

  put: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PUT", body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: Omit<ApiRequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
};