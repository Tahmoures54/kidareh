(() => {
  "use strict";
  const tokenMeta = () => document.querySelector('meta[name="csrf-token"]');
  const digits = (value) => String(value ?? "").replace(/[۰-۹٠-٩]/g, (character) => {
    const index = "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩".indexOf(character);
    return index >= 0 ? String(index % 10) : character;
  });
  function safeNext(value) {
    if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || value.includes("\n")) return "";
    try {
      const url = new URL(value, window.location.origin);
      return url.origin === window.location.origin ? url.pathname + url.search + url.hash : "";
    } catch { return ""; }
  }
  function nextUrl(path) {
    const params = new URLSearchParams(window.location.search);
    const destination = safeNext(params.get("next") || "");
    return path + (destination ? "?next=" + encodeURIComponent(destination) : "");
  }
  async function api(path, payload, options = {}) {
    const method = options.method || (payload === undefined ? "GET" : "POST");
    const headers = { Accept: "application/json", ...(options.headers || {}) };
    if (payload !== undefined) {
      headers["Content-Type"] = "application/json";
      headers["X-CSRF-Token"] = tokenMeta()?.content || "";
    } else if (method !== "GET") headers["X-CSRF-Token"] = tokenMeta()?.content || "";
    const response = await fetch(path.startsWith("/api/") ? path : "/api/auth/" + path, {
      method, credentials: "same-origin", cache: "no-store", headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.message || "درخواست انجام نشد؛ دوباره تلاش کنید.");
      error.status = response.status; error.code = data.error || "request_failed"; error.retryAfter = data.retry_after || 0;
      throw error;
    }
    return data;
  }
  function feedback(element, message, isError = false) {
    if (!element) return;
    element.textContent = message || "";
    element.classList.toggle("success", Boolean(message) && !isError);
    element.setAttribute("role", isError ? "alert" : "status");
  }
  async function redirectForUser(user, preferredNext = "") {
    const destination = safeNext(preferredNext);
    if (user?.role === "seller") {
      try {
        const store = await api("/api/my/store");
        if (!store.item) { window.location.assign(nextUrl("/register/store")); return; }
      } catch (error) {
        if (error.status === 401) { window.location.assign("/login"); return; }
      }
      window.location.assign(destination || "/seller");
      return;
    }
    window.location.assign(destination || "/account");
  }
  window.KidarehAuth = Object.freeze({ api, digits, feedback, nextUrl, safeNext, redirectForUser });
})();
