import { useQuery } from "@tanstack/react-query";
import { BadgeItem } from "./types";

// دیتای پیش‌فرض (فال‌بک) تا زمانی که API بک‌اند آماده شود
const DEFAULT_BADGES: BadgeItem[] = [
  { id: "بلک فرایدی", name: "بلک فرایدی", iconName: "Flame", gradient: "from-gray-900 to-gray-800", darkGradient: "dark:from-gray-100 dark:to-gray-300", iconColor: "text-white dark:text-gray-900", desc: "پرطرفدارترین! فروش خود را در روزهای خاص چندبرابر کنید.", category: "vip" },
  { id: "جشنواره نوروزی", name: "جشنواره نوروزی", iconName: "Sparkles", gradient: "from-emerald-500 to-teal-600", darkGradient: "dark:from-emerald-400 dark:to-teal-500", iconColor: "text-white", desc: "بزرگترین رویداد فروش سال ویژه عید نوروز.", category: "vip" },
  { id: "جشنواره بهاری", name: "جشنواره بهاری", iconName: "Gift", gradient: "from-pink-500 to-rose-500", darkGradient: "dark:from-pink-500 dark:to-rose-600", iconColor: "text-white", desc: "ویژه فروش‌های نوروزی و فصل بهار با بازدید بالا.", category: "vip" },
  { id: "جشنواره یلدا", name: "جشنواره شب یلدا", iconName: "ShoppingBag", gradient: "from-red-600 to-rose-700", darkGradient: "dark:from-red-500 dark:to-rose-600", iconColor: "text-white", desc: "فروش شگفت‌انگیز برای شب یلدا و تخفیف‌های ویژه.", category: "vip" },
  { id: "تیک آبی فروشگاه", name: "تیک آبی فروشگاه", iconName: "BadgeCheck", gradient: "from-blue-500 to-indigo-600", darkGradient: "dark:from-blue-500 dark:to-indigo-500", iconColor: "text-white", desc: "تأیید هویت فروشگاه. افزایش اعتماد و فروش بیشتر.", category: "store" },
  { id: "پیشنهاد ویژه", name: "پیشنهاد ویژه", iconName: "Sparkles", gradient: "from-fuchsia-500 to-purple-600", darkGradient: "dark:from-fuchsia-500 dark:to-purple-500", iconColor: "text-white", desc: "جلب توجه خریداران برای بهترین کالاها.", category: "regular" },
  { id: "پرفروش‌ترین", name: "پرفروش‌ترین", iconName: "TrendingUp", gradient: "from-amber-400 to-orange-500", darkGradient: "dark:from-amber-500 dark:to-orange-500", iconColor: "text-white", desc: "نشان دادن اعتبار و محبوبیت کالای شما.", category: "regular" },
  { id: "تخفیف ویژه", name: "تخفیف ویژه", iconName: "Tag", gradient: "from-rose-500 to-red-500", darkGradient: "dark:from-rose-500 dark:to-red-600", iconColor: "text-white", desc: "مناسب برای کالاهایی که تخفیف واقعی دارند.", category: "regular" },
  { id: "حراج", name: "حراج", iconName: "Zap", gradient: "from-purple-500 to-violet-600", darkGradient: "dark:from-purple-400 dark:to-violet-500", iconColor: "text-white", desc: "برای فروش سریع کالاهای تک سایز یا آخر بار.", category: "regular" },
  { id: "جدید", name: "جدید", iconName: "Sparkles", gradient: "from-cyan-500 to-blue-500", darkGradient: "dark:from-cyan-500 dark:to-blue-600", iconColor: "text-white", desc: "معرفی کالاهای تازه وارد شده به صورت چشمگیر.", category: "regular" },
  { id: "خرید عمده", name: "خرید عمده", iconName: "ShoppingCart", gradient: "from-slate-600 to-gray-700", darkGradient: "dark:from-slate-500 dark:to-gray-600", iconColor: "text-white", desc: "نمایش امکان فروش عمده با قیمت کمتر.", category: "regular" },
];

export const useBadges = () => {
  return useQuery({
    queryKey: ["available-badges"],
    queryFn: async () => {
      const res = await fetch("/api/badges/available");
      if (!res.ok) throw new Error("Failed to fetch badges");
      return (await res.json()) as BadgeItem[];
    },
    // اگر سرور جواب نداد یا هنوز API نساخته‌اید، این دیتای پیش‌فرض لود می‌شود
    initialData: DEFAULT_BADGES, 
  });
};