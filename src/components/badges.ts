/**
 * پکیج‌های دیده شدن — هماهنگ با سرور /api/promotions/catalog
 * زبان ساده برای فروشنده غیرحرفه‌ای
 */
import {
  Sparkles,
  TrendingUp,
  Megaphone,
  Package,
  BadgeCheck,
  Zap,
  CircleFadingPlus,
  type LucideIcon,
} from "lucide-react";

export interface BadgeType {
  id: string;
  name: string;
  category: "story" | "trial" | "boost" | "banner" | "trust";
  price: number;
  days: number;
  icon: LucideIcon;
  gradient: string;
  simpleDesc: string; // یک جمله ساده
  benefit: string; // فایده ملموس
  recommended?: boolean;
}

export const BADGES_LIST: BadgeType[] = [
  {
    id: "market_story_1d",
    name: "استوری بازار (۲۴ ساعت)",
    category: "story",
    price: 19000,
    days: 1,
    icon: CircleFadingPlus,
    gradient: "from-amber-400 via-rose-500 to-fuchsia-600",
    simpleDesc: "حلقه استوری بالای بازار، مثل اینستاگرام",
    benefit: "مشتری با یک لمس ویترین‌تان را می‌بیند",
  },
  {
    id: "market_story_3d",
    name: "استوری بازار (۳ روز)",
    category: "story",
    price: 45000,
    days: 3,
    icon: CircleFadingPlus,
    gradient: "from-rose-500 to-violet-600",
    simpleDesc: "سه روز در ردیف افقی بالای بازار شهر شما",
    benefit: "جای اول صفحه؛ بیشتر از برچسب دیده می‌شوید",
    recommended: true,
  },
  {
    id: "market_story_7d",
    name: "استوری بازار (۷ روز)",
    category: "story",
    price: 89000,
    days: 7,
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-orange-500",
    simpleDesc: "یک هفته استوری بالای بازار همان شهر",
    benefit: "کالاهایتان فریم‌به‌فریم برای محله پخش می‌شود",
  },
  {
    id: "trial_boost_3d",
    name: "آزمایش ۳ روزه",
    category: "trial",
    price: 9000,
    days: 3,
    icon: Zap,
    gradient: "from-emerald-400 to-teal-500",
    simpleDesc: "اول امتحان کنید؛ بعداً ادامه دهید",
    benefit: "کالاهای شما ۳ روز بالاتر دیده می‌شوند",
  },
  {
    id: "search_boost_7d",
    name: "بالا آمدن در جستجو (۷ روز)",
    category: "boost",
    price: 49000,
    days: 7,
    icon: TrendingUp,
    gradient: "from-indigo-500 to-violet-600",
    simpleDesc: "وقتی مشتری جستجو می‌کند، شما جلوترید",
    benefit: "اولویت در نتایج همان شهر",
    recommended: true,
  },
  {
    id: "search_boost_30d",
    name: "بالا آمدن در جستجو (۳۰ روز)",
    category: "boost",
    price: 149000,
    days: 30,
    icon: Sparkles,
    gradient: "from-violet-500 to-purple-700",
    simpleDesc: "یک ماه دیده شدن بیشتر — به‌صرفه‌تر از هفتگی",
    benefit: "اولویت ماهانه در جستجو",
  },
  {
    id: "homepage_banner_7d",
    name: "بنر صفحه اول (۷ روز)",
    category: "banner",
    price: 99000,
    days: 7,
    icon: Megaphone,
    gradient: "from-amber-400 to-orange-500",
    simpleDesc: "عکس فروشگاه‌تان بالای صفحه اصلی اپ",
    benefit: "مثل ویترین مغازه، فقط داخل اپ",
  },
  {
    id: "homepage_banner_30d",
    name: "بنر صفحه اول (۳۰ روز)",
    category: "banner",
    price: 299000,
    days: 30,
    icon: Megaphone,
    gradient: "from-orange-500 to-rose-500",
    simpleDesc: "یک ماه بنر در صفحه اول برای شهر شما",
    benefit: "حضور مداوم بالای صفحه",
  },
  {
    id: "visibility_bundle_7d",
    name: "بسته کامل دیده شدن (۷ روز)",
    category: "boost",
    price: 149000,
    days: 7,
    icon: Package,
    gradient: "from-fuchsia-500 to-pink-600",
    simpleDesc: "استوری بالای بازار + بنر + بالا آمدن در جستجو",
    benefit: "قوی‌ترین دیده شدن برای هفته شلوغ",
    recommended: true,
  },
  {
    id: "blue_tick_30d",
    name: "تیک آبی اعتماد (۳۰ روز)",
    category: "trust",
    price: 79000,
    days: 30,
    icon: BadgeCheck,
    gradient: "from-sky-400 to-blue-600",
    simpleDesc: "علامت اعتماد کنار اسم فروشگاه",
    benefit: "مشتری راحت‌تر به مغازه می‌آید",
  },
];

export const CATEGORY_LABELS: Record<BadgeType["category"], string> = {
  story: "استوری بالای بازار",
  trial: "شروع آسان",
  boost: "دیده شدن در جستجو",
  banner: "تبلیغ صفحه اول",
  trust: "اعتماد مشتری",
};
