export type Category = "vip" | "store" | "regular";

export interface BadgeItem {
  id: string;
  name: string;
  iconName: string; // 👈 نام آیکون که از دیتابیس می‌آید
  gradient: string;
  darkGradient: string;
  iconColor: string;
  desc: string;
  category: Category;
  price?: number; // 👈 قیمت می‌تواند مستقیماً از دیتابیس بیاید
}