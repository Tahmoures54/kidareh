import { Search, Store, MapPin, Zap } from "lucide-react";
import { Msg } from "./types";

export const PROMPTS = [
  { icon: Search, label: "گوشی سامسونگ نزدیک من" },
  { icon: Store,  label: "فروشگاه‌های معتبر اطراف" },
  { icon: MapPin, label: "نزدیک‌ترین بازار موبایل" },
  { icon: Zap,    label: "ارزان‌ترین لپ‌تاپ گیمینگ" },
];

export const WELCOME: Msg = {
  id: "welcome-1",
  role: "ai",
  text: "سلام! من دستیار هوشمند کی‌داره هستم ✨\nمی‌تونم تو پیدا کردن بهترین کالا، مقایسه قیمت‌ها و پیدا کردن فروشگاه‌های اطراف کمکت کنم. چطور می‌تونم راهنماییت کنم؟",
};