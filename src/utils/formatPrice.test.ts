// src/utils/formatPrice.test.ts
import { describe, it, expect } from "vitest";
import { formatPrice } from "./formatPrice";

describe("formatPrice", () => {
  it("اعداد را با جداکننده هزارگان و ارقام فارسی فرمت می‌کند", () => {
    const result = formatPrice(50000);
    expect(result).toBe("۵۰٬۰۰۰");
  });

  it("ورودی رشته‌ای عددی را درست فرمت می‌کند", () => {
    expect(formatPrice("1500000")).toBe("۱٬۵۰۰٬۰۰۰");
  });

  it("ورودی رشته‌ای با جداکننده/متن را نرمال‌سازی می‌کند", () => {
    expect(formatPrice("1,500,000 تومان")).toBe("۱٬۵۰۰٬۰۰۰");
  });

  it("برای ورودی نامعتبر مقدار صفر فارسی برمی‌گرداند", () => {
    expect(formatPrice("invalid_string")).toBe("۰");
  });

  it("برای null/undefined/empty string خروجی خالی می‌دهد", () => {
    expect(formatPrice(null)).toBe("");
    expect(formatPrice(undefined)).toBe("");
    expect(formatPrice("")).toBe("");
  });

  it("اعداد منفی را پشتیبانی می‌کند", () => {
    expect(formatPrice(-12000)).toBe("‎−۱۲٬۰۰۰");
  });
});