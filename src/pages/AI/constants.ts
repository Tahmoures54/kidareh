import { Search, Store, MapPin, Zap } from "lucide-react";
import { Msg } from "./types";

export const PROMPTS = [
  { icon: Search, label: "گوشی سامسونگ نزدیک من" },
  { icon: Store, label: "فروشگاه‌های معتبر اطراف" },
  { icon: MapPin, label: "نزدیک‌ترین بازار موبایل" },
  { icon: Zap, label: "ارزان‌ترین لپ‌تاپ گیمینگ" },
];

export const WELCOME: Msg = {
  id: "welcome-1",
  role: "ai",
  text: "سلام! من دستیار خرید کی‌داره هستم ✨\nکالایی که می‌خواهید را بگویید؛ من آن را در فروشگاه‌های ثبت‌شده جستجو می‌کنم و گزینه‌ها را بر اساس موجودی، قیمت و فاصله به شما نشان می‌دهم.\n\nمثلاً بگویید: «لپ‌تاپ گیمینگ تا ۶۰ میلیون نزدیک من».",
};