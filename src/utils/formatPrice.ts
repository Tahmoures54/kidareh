/**
 * تبدیل عدد/رشته به فرمت قیمت فارسی با جداکننده هزارگان
 *
 * رفتار:
 * - null | undefined | '' => ''
 * - ورودی نامعتبر => '۰'
 * - اعداد منفی پشتیبانی می‌شوند
 * - اعداد اعشاری گرد می‌شوند
 * - اعداد فارسی/عربی هم پشتیبانی می‌شوند
 *
 * @example
 * formatPrice(1500000)             // "۱٬۵۰۰٬۰۰۰"
 * formatPrice("1,500,000")         // "۱٬۵۰۰٬۰۰۰"
 * formatPrice("۱٬۵۰۰٬۰۰۰")         // "۱٬۵۰۰٬۰۰۰"
 * formatPrice("1500000.6")         // "۱٬۵۰۰٬۰۰۱"
 * formatPrice(" -1,500,000 تومان") // "-۱٬۵۰۰٬۰۰۰"
 * formatPrice("abc")               // "۰"
 */
const toEnglishDigits = (value: string): string => {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(/[۰-۹]/g, (char) => String(persianDigits.indexOf(char)))
    .replace(/[٠-٩]/g, (char) => String(arabicDigits.indexOf(char)));
};

export const formatPrice = (
  price: number | string | null | undefined
): string => {
  if (price === null || price === undefined || price === "") return "";

  let numericPrice: number;

  if (typeof price === "number") {
    numericPrice = price;
  } else {
    const raw = toEnglishDigits(String(price).trim());

    // تبدیل جداکننده اعشاری فارسی به نقطه
    // حذف جداکننده هزارگان، فاصله، و متن‌های اضافی
    let normalized = raw
      .replace(/٫/g, ".")
      .replace(/[٬,\s]/g, "")
      .replace(/[^\d.-]/g, "");

    // فقط یک منفی در ابتدای رشته مجاز است
    normalized = normalized.replace(/(?!^)-/g, "");

    // فقط یک نقطه اعشار نگه داشته شود
    const firstDotIndex = normalized.indexOf(".");
    if (firstDotIndex !== -1) {
      normalized =
        normalized.slice(0, firstDotIndex + 1) +
        normalized.slice(firstDotIndex + 1).replace(/\./g, "");
    }

    if (!normalized || normalized === "-" || normalized === ".") {
      return "۰";
    }

    numericPrice = Number(normalized);
  }

  if (!Number.isFinite(numericPrice)) return "۰";

  const integerValue = Math.round(numericPrice);

  return new Intl.NumberFormat("fa-IR", {
    maximumFractionDigits: 0,
  }).format(integerValue);
};