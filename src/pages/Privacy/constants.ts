import { Shield, Eye, Lock, ShieldCheck, BellRing, Users } from "lucide-react";

export const ITEMS = [
  {
    icon: Shield,
    gradient: "from-blue-500 to-indigo-500",
    darkGradient: "dark:from-blue-600 dark:to-indigo-600",
    title: "تعهد ما",
    text: "ما در کی‌داره متعهد هستیم اطلاعات شخصی کاربران را محافظت کنیم و فقط داده‌های ضروری برای ارائه خدمات را جمع‌آوری کنیم.",
  },
  {
    icon: Eye,
    gradient: "from-indigo-500 to-violet-500",
    darkGradient: "dark:from-indigo-600 dark:to-violet-600",
    title: "اطلاعات جمع‌آوری‌شده",
    text: "شماره موبایل، نام، موقعیت جغرافیایی (با اجازه)، اطلاعات فروشگاه و کالا، و تنظیمات حساب.",
  },
  {
    icon: Lock,
    gradient: "from-emerald-400 to-teal-500",
    darkGradient: "dark:from-emerald-500 dark:to-teal-600",
    title: "نحوه استفاده",
    text: "اطلاعات صرفاً برای ارائه خدمات، بهبود تجربه کاربری و ارتباط ضروری استفاده می‌شوند. هرگز به اشخاص ثالث فروخته نمی‌شوند.",
  },
  {
    icon: ShieldCheck,
    gradient: "from-rose-400 to-red-500",
    darkGradient: "dark:from-rose-500 dark:to-red-600",
    title: "امنیت داده‌ها",
    text: "از رمزنگاری استاندارد، فایروال و کنترل دسترسی برای محافظت از داده‌های شما استفاده می‌کنیم.",
  },
  {
    icon: BellRing,
    gradient: "from-amber-400 to-orange-500",
    darkGradient: "dark:from-amber-500 dark:to-orange-600",
    title: "اعلان‌ها",
    text: "ممکن است برای اطلاع‌رسانی امکانات جدید یا موارد امنیتی پیام‌های سیستمی ارسال شود.",
  },
  {
    icon: Users,
    gradient: "from-fuchsia-400 to-purple-500",
    darkGradient: "dark:from-fuchsia-500 dark:to-purple-600",
    title: "حقوق کاربر",
    text: "حق دارید در هر زمان درخواست حذف حساب و داده‌هایتان را بدهید. با پشتیبانی تماس بگیرید.",
  },
];

export const COMMITMENTS = [
  "اطلاعات شما هرگز فروخته یا اجاره داده نمی‌شود.",
  "دسترسی به موقعیت مکانی (GPS) فقط با اجازه شماست.",
  "امکان حذف کامل حساب کاربری در هر زمان وجود دارد.",
  "اعلان‌های سیستم کاملاً قابل شخصی‌سازی هستند.",
];

export const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  },
  item: {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }
};