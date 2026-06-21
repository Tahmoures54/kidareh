// src/utils/formatPrice.ts

/**
 * تبدیل عدد/رشته به فرمت قیمت فارسی با جداکننده هزارگان
 *
 * رفتار:
 * - null | undefined | '' => ''
 * - ورودی نامعتبر => '۰'
 * - اعداد منفی پشتیبانی می‌شوند
 *
 * @example
 * formatPrice(1500000)        // "۱٬۵۰۰٬۰۰۰"
 * formatPrice("1,500,000")    // "۱٬۵۰۰٬۰۰۰"
 * formatPrice("abc")          // "۰"
 */
export const formatPrice = (price: number | string | null | undefined): string => {
  if (price === null || price === undefined || price === "") return "";

  let numericPrice: number;

  if (typeof price === "number") {
    numericPrice = price;
  } else {
    const raw = String(price).trim();

    // نگه داشتن رقم‌ها و علامت منفی، حذف جداکننده‌ها/حروف
    // مثال: " -1,500,000 تومان " -> "-1500000"
    const normalized = raw
      .replace(/[,\s٬٫]/g, "")
      .replace(/[^\d-]/g, "");

    // فقط یک منفی در ابتدای رشته معتبر است
    const safe = normalized.replace(/(?!^)-/g, "");

    numericPrice = Number(safe);
  }

  if (!Number.isFinite(numericPrice)) return "۰";

  // اگر اعشاری وارد شد، به نزدیک‌ترین عدد صحیح گرد شود
  const integerValue = Math.round(numericPrice);

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
  }).format(integerValue);
};