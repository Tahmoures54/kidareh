type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface ApiRequestOptions<TBody = unknown> {
  method?: HttpMethod;
  body?: TBody;
  headers?: Record<string, string>;
  timeoutMs?: number;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  /**
   * 🔧 true = این درخواست «فرض» می‌کند نشست فعال داریم؛ 401 یعنی نشست منقضی شده.
   * false (پیش‌فرض) = درخواست عمومی؛ 401 فقط یعنی «دسترسی نداری» — نه خروج!
   */
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

const DEFAULT_TIMEOUT = 20000; // ۲۰ ثانیه

const getBaseUrl = () => {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return envBase || window.location.origin;
};

const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, "");
const normalizePath = (p: string) => (p.startsWith("/") ? p : `/${p}`);

// Authentication is cookie-only. Never read or persist session tokens in Web Storage.
function clearLegacyTokens(): void {
  for (const key of ["kidareh_token_v1", "token", "auth_token_v1", "auth_refresh_token_v1", "auth_token_expiry_v1"]) {
    localStorage.removeItem(key);
  }
}

// 🔧 مسیری که 401 آن «طبیعی» است (بررسی نشست) — خود AuthContext جوابش را مدیریت می‌کند
const isSessionCheckPath = (p: string) => /\/auth\/me\/?$/i.test(p);

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
    auth = false, // 🔧 پیش‌فرض false — مهمان‌ها دیگر قربانی 401 نمی‌شوند
  } = options;

  const base = normalizeBaseUrl(getBaseUrl());
  const normalizedPath = normalizePath(path);
  const baseHasApiPrefix = /\/api$/i.test(base);
  const cleanPath = baseHasApiPrefix && /^\/api(?:\/|$)/i.test(normalizedPath)
    ? normalizedPath.replace(/^\/api/i, "") || "/"
    : normalizedPath;
  const url = `${base}${cleanPath}`;
  const mergedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...headers,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);

  // 🔧 پاک‌سازی شنونده برای جلوگیری از نشت حافظه
  const onOuterAbort = () => {
    clearTimeout(timeoutId);
    controller.abort(signal?.reason);
  };
  if (signal) {
    if (signal.aborted) onOuterAbort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  let res: Response;

  try {
    res = await fetch(url, {
      method,
      credentials,
      headers: mergedHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error: any) {
    if (error.name === "AbortError" || error.message === "Request timeout") {
      throw new ApiError("ارتباط با سرور قطع شد (تایم‌اوت).", 408);
    }
    throw new ApiError("خطا در برقراری ارتباط با اینترنت.", 0);
  } finally {
    clearTimeout(timeoutId);
    signal?.removeEventListener("abort", onOuterAbort);
  }

  // 🛡️ 🔧 مدیریت 401 — فقط وقتی «انقضای نشست» معنا دارد، نه برای مهمان
  if (res.status === 401) {
    clearLegacyTokens();
    if (auth && !isSessionCheckPath(normalizedPath)) {
      window.dispatchEvent(
        new CustomEvent("kidareh:unauthorized", { detail: { path: normalizedPath } })
      );
    }
  }

  let data: any = null;
  const status = res.status;

  if (status !== 204 && status !== 304) {
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      }
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `خطای سرور (${res.status})`;
    throw new ApiError(message, res.status, data);
  }

  return data as TResponse;
}

// ✅ شیء api برای سازگاری با کدهای قدیمی (بدون تغییر)
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
