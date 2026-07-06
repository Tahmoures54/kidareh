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

const DEFAULT_TIMEOUT = 20000; // ۲۰ ثانیه

const getBaseUrl = () => {
  const envBase = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  return envBase || window.location.origin;
};

const normalizeBaseUrl = (base: string) => base.replace(/\/+$/, "");
const normalizePath = (p: string) => (p.startsWith("/") ? p : `/${p}`);

// 🔑 خواندن امن توکن
function readToken(): string {
  return localStorage.getItem("kidareh_token_v1") || localStorage.getItem("token") || "";
}

// 🧹 پاک کردن توکن هنگام انقضا
function clearToken(): void {
  localStorage.removeItem("kidareh_token_v1");
  localStorage.removeItem("token");
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
    "Accept": "application/json", // Pro Tip: همیشه به سرور بگویید JSON می‌خواهید
    ...headers,
  };

  if (auth && token && !mergedHeaders.Authorization) {
    mergedHeaders.Authorization = `Bearer ${token}`;
  }

  // 🚀 Pro Tip: True Network Timeout & Signal Combiner
  // لغو واقعی درخواست در سطح مرورگر برای جلوگیری از هدر رفت منابع لیارا
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs);
  
  // اگر کامپوننت (مثلاً سرچ) خواست درخواست را لغو کند، تایمر را هم لغو می‌کنیم
  if (signal) {
    signal.addEventListener("abort", () => {
      clearTimeout(timeoutId);
      controller.abort(signal.reason);
    });
  }

  let res: Response;

  try {
    res = await fetch(url, {
      method,
      credentials,
      headers: mergedHeaders,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal, // پاس دادن سیگنال کنترلر خودمان
      cache: "no-store", 
    });
  } catch (error: any) {
    // تبدیل ارورهای سطح شبکه (قطعی اینترنت یا لغو شدن) به ساختار قابل فهم
    if (error.name === "AbortError" || error.message === "Request timeout") {
      throw new ApiError("ارتباط با سرور قطع شد (تایم‌اوت).", 408);
    }
    throw new ApiError("خطا در برقراری ارتباط با اینترنت.", 0);
  } finally {
    clearTimeout(timeoutId); // جلوگیری از Memory Leak تایمرها
  }

  // 🛡️ Pro Tip: مدیریت خروج خودکار (401 Unauthorized)
  if (res.status === 401) {
    clearToken();
    // ارسال یک رویداد سراسری (Event) تا AuthContext متوجه شود و کاربر را لاگ‌اوت کند
    window.dispatchEvent(new CustomEvent("kidareh:unauthorized"));
  }

  // 🚀 Pro Tip: پارس کردن بهینه و امن پاسخ
  let data: any = null;
  const status = res.status;

  if (status !== 204 && status !== 304) {
    try {
      const contentType = res.headers.get("content-type");
      // فقط اگر سرور واقعاً JSON فرستاده بود از متد سریع json() استفاده می‌کنیم
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = text ? JSON.parse(text) : null; // Fallback برای سرورهایی که هدر اشتباه می‌دهند
      }
    } catch {
      data = null; // اگر پارس نشد، اپلیکیشن کرش نکند
    }
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `خطای سرور (${res.status})`;
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
