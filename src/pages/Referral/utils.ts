export function fa(n: number | string): string {
  return Number(n || 0).toLocaleString("fa-IR");
}

export function fmtDate(d?: string): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
  } catch {
    return d;
  }
}

export function validateIban(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "شماره شبا الزامی است";
  if (digits.length !== 24) return "شماره شبا باید ۲۴ رقم باشد";
  return null;
}

export function fmtIban(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 24).replace(/(\d{4})/g, "$1 ").trim();
}