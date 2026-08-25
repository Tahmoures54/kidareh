// tests/frontend/components/ProductCard.test.tsx
import { describe, it, expect } from "vitest";
import { formatPrice, getBadgeStyle } from "@utils";

// ─── نمونه محصول ───
const mockProduct = {
  id: 1,
  name: "گوشی سامسونگ A54",
  price: 12500000,
  image_url: "https://example.com/phone.jpg",
  store_name: "فروشگاه دیجی کالا",
  city: "تهران",
  status: "موجود",
  badge: "پیشنهاد ویژه",
  views: 340,
  created_at: new Date().toISOString(),
};

// ─── formatPrice ───
describe("formatPrice", () => {
  it("قیمت عددی را به فرمت فارسی تبدیل می‌کند", () => {
    const result = formatPrice(mockProduct.price);
    expect(result).toMatch(/[۰-۹]/);
    expect(result).toMatch(/[,٬]/);
  });

  it("قیمت صفر را بدون خطا نمایش می‌دهد", () => {
    const result = formatPrice(0);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("قیمت‌های بزرگ را بدون خطا پردازش می‌کند", () => {
    expect(() => formatPrice(999_000_000)).not.toThrow();
  });
});

// ─── getBadgeStyle ───
describe("getBadgeStyle", () => {
  it("برای پیشنهاد ویژه کلاس معتبر برمی‌گرداند", () => {
    const style = getBadgeStyle("پیشنهاد ویژه");
    expect(style).toContain("fuchsia");
  });

  it("برای تخفیف ویژه کلاس معتبر برمی‌گرداند", () => {
    const style = getBadgeStyle("تخفیف ویژه");
    expect(style).toContain("rose");
  });

  it("برای badge ناشناخته fallback خاکستری برمی‌گرداند", () => {
    const style = getBadgeStyle("یک برچسب عجیب");
    expect(style).toContain("gray");
  });

  it("برای null کلاس پیش‌فرض برمی‌گرداند", () => {
    const style = getBadgeStyle(null);
    expect(style).toContain("gray");
  });

  it("برای undefined کلاس پیش‌فرض برمی‌گرداند", () => {
    const style = getBadgeStyle(undefined);
    expect(style).toContain("gray");
  });

  it("متن عربی را مثل فارسی normalize می‌کند", () => {
    const styleArabic = getBadgeStyle("جديد");
    const stylePersian = getBadgeStyle("جدید");

    expect(styleArabic).toBe(stylePersian);
  });
});

// ─── منطق وضعیت محصول ───
describe("product status CSS logic", () => {
  const getStatusClass = (status: string) => {
    if (status === "موجود") return "bg-green-50 text-green-600";
    if (status === "فقط ۱ عدد") return "bg-amber-50 text-amber-600";
    return "bg-gray-50 text-gray-400";
  };

  it("وضعیت موجود → کلاس سبز", () => {
    expect(getStatusClass("موجود")).toContain("green");
  });

  it("وضعیت فقط ۱ عدد → کلاس زرد", () => {
    expect(getStatusClass("فقط ۱ عدد")).toContain("amber");
  });

  it("وضعیت ناموجود → کلاس خاکستری", () => {
    expect(getStatusClass("ناموجود")).toContain("gray");
  });
});

// ─── منطق نمایش قیمت ───
describe("price display logic", () => {
  const displayPrice = (price: number | null | undefined) =>
    price ? formatPrice(price) : "توافقی";

  it("قیمت null → توافقی", () => {
    expect(displayPrice(null)).toBe("توافقی");
  });

  it("قیمت undefined → توافقی", () => {
    expect(displayPrice(undefined)).toBe("توافقی");
  });

  it("قیمت صفر → توافقی", () => {
    expect(displayPrice(0)).toBe("توافقی");
  });

  it("قیمت معتبر → توافقی نیست", () => {
    expect(displayPrice(1_000_000)).not.toBe("توافقی");
  });
});