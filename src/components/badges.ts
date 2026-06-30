import { 
  Flame, Sparkles, Gift, ShoppingBag, 
  TrendingUp, Tag, Zap, Crown, Store 
} from "lucide-react";

export interface BadgeType {
  id: string;
  name: string;
  category: "vip" | "store" | "regular";
  price: number;
  icon: any;
  gradient: string;
  darkGradient?: string;
}

export const BADGES_LIST: BadgeType[] = [
  // 🏆 دسته رویدادها (VIP)
  { id: "بلک فرایدی", name: "بلک فرایدی", category: "vip", price: 50000, icon: Flame, gradient: "from-gray-800 to-black", darkGradient: "dark:from-gray-100 dark:to-gray-300" },
  { id: "جشنواره نوروزی", name: "جشنواره نوروزی", category: "vip", price: 45000, icon: Sparkles, gradient: "from-emerald-400 to-teal-500", darkGradient: "dark:from-emerald-500 dark:to-teal-600" },
  { id: "جشنواره بهاری", name: "جشنواره بهاری", category: "vip", price: 40000, icon: Gift, gradient: "from-pink-400 to-rose-500", darkGradient: "dark:from-pink-500 dark:to-rose-600" },
  { id: "جشنواره یلدا", name: "جشنواره یلدا", category: "vip", price: 40000, icon: ShoppingBag, gradient: "from-red-500 to-rose-700", darkGradient: "dark:from-red-600 dark:to-rose-800" },

  // ✨ دسته اعتبار فروشگاه (Store)
  { id: "پرفروش‌ترین", name: "پرفروش‌ترین", category: "store", price: 30000, icon: TrendingUp, gradient: "from-amber-400 to-orange-500", darkGradient: "dark:from-amber-500 dark:to-orange-600" },
  { id: "پیشنهاد ویژه", name: "پیشنهاد ویژه", category: "store", price: 25000, icon: Crown, gradient: "from-fuchsia-400 to-purple-600", darkGradient: "dark:from-fuchsia-500 dark:to-purple-700" },

  // 🛍️ دسته روزمره (Regular)
  { id: "حراج", name: "حراج", category: "regular", price: 15000, icon: Zap, gradient: "from-purple-400 to-indigo-500", darkGradient: "dark:from-purple-500 dark:to-indigo-600" },
  { id: "تخفیف ویژه", name: "تخفیف ویژه", category: "regular", price: 10000, icon: Tag, gradient: "from-rose-400 to-red-500", darkGradient: "dark:from-rose-500 dark:to-red-600" },
  { id: "جدید", name: "جدید", category: "regular", price: 12000, icon: Sparkles, gradient: "from-cyan-400 to-blue-500", darkGradient: "dark:from-cyan-500 dark:to-blue-600" },
];