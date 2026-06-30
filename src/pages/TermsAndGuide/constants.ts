import { 
  Scale, ShieldCheck, HelpCircle, Gavel, Store, Users, 
  Lock, Eye, BellRing, Smartphone, Search, BadgeCheck, 
  TrendingUp, PhoneCall, Navigation, ReceiptText 
} from "lucide-react";
import { TabConfig } from "./types";

export const TABS: TabConfig[] = [
  { id: "terms",   label: "قوانین و مقررات", icon: Scale        },
  { id: "privacy", label: "حریم خصوصی",      icon: ShieldCheck  },
  { id: "guide",   label: "راهنمای استفاده", icon: HelpCircle   },
];

export const TERMS_SECTIONS = [
  {
    icon: Gavel,
    gradient: "from-blue-500 to-indigo-600",
    darkGradient: "dark:from-blue-600 dark:to-indigo-700",
    title: "تعهدات کاربر",
    items: [
      "کاربر متعهد است اطلاعات صحیح و قانونی ثبت کند.",
      "درج محتوای مجرمانه، غیرقانونی یا توهین‌آمیز اکیداً ممنوع است.",
      "انتشار کالا ممکن است مشروط به تأیید سامانه باشد.",
      "کی‌داره مجاز است محتوای خلاف قوانین را بدون اخطار قبلی حذف کند.",
    ],
  },
  {
    icon: Store,
    gradient: "from-emerald-500 to-teal-600",
    darkGradient: "dark:from-emerald-600 dark:to-teal-700",
    title: "قوانین فروشندگان",
    items: [
      "درج اطلاعات واقعی درباره کالا، قیمت و موجودی الزامی است.",
      "فروشنده مسئول تمام معاملاتی است که از طریق پلتفرم انجام می‌دهد.",
      "عکس‌های ارسالی باید دقیقاً متعلق به خود کالا باشند.",
    ],
  },
  {
    icon: Users,
    gradient: "from-amber-400 to-orange-500",
    darkGradient: "dark:from-amber-500 dark:to-orange-600",
    title: "قوانین خریداران",
    items: [
      "بررسی حضوری کالا قبل از هرگونه پرداخت وجه توصیه می‌شود.",
      "کی‌داره هیچ‌گونه مسئولیتی در قبال معاملات بین کاربران ندارد.",
      "گزارش هرگونه تخلف و کلاهبرداری از طریق بخش مربوطه امکان‌پذیر است.",
    ],
  },
];

export const PRIVACY_ITEMS = [
  { icon: Lock, title: "امنیت داده‌ها", text: "اطلاعات با الگوریتم‌های رمزنگاری استاندارد محافظت می‌شود.", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20" },
  { icon: Eye, title: "نمایش عمومی", text: "فقط بخشی از اطلاعات فروشگاه و کالاها به صورت عمومی نمایش داده می‌شود.", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20" },
  { icon: BellRing, title: "اعلان‌های سیستم", text: "ممکن است پیام‌های امنیتی یا اطلاع‌رسانی مهم سیستمی برای شما ارسال شود.", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20" },
  { icon: Smartphone, title: "دسترسی‌ها", text: "مجوزهایی مثل GPS فقط برای امکانات مرتبط استفاده شده و ذخیره نمی‌شوند.", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20" },
];

export const GUIDES = [
  { icon: Search, title: "چطور کالا پیدا کنم؟", desc: "در صفحه اصلی نام کالا را جستجو کنید. اگر موقعیت مکانی فعال باشد، نزدیک‌ترین‌ها اول نمایش داده می‌شوند.", kw: ["جستجو", "موقعیت", "نزدیک"] },
  { icon: Store, title: "چطور فروشگاه ثبت کنم؟", desc: "بعد از ورود به حساب کاربری، از قسمت پنل فروشنده اطلاعات فروشگاه را تکمیل و کالاها را ثبت کنید.", kw: ["فروشنده", "ثبت", "فروشگاه"] },
  { icon: BadgeCheck, title: "وضعیت تأیید کالا یعنی چه؟", desc: "کالا پس از ثبت ممکن است نیاز به بررسی داشته باشد. فقط کالاهای تأییدشده در نتایج جستجو نمایش داده می‌شوند.", kw: ["تأیید", "انتشار", "وضعیت"] },
  { icon: TrendingUp, title: "سیستم کسب درآمد چیست؟", desc: "با دریافت کد معرف و دعوت از فروشگاه‌های جدید، از تراکنش‌ها و ارتقاهای آن‌ها درصد پورسانت دریافت کنید و درآمد خود را برداشت کنید.", kw: ["درآمد", "معرفی", "پورسانت", "برداشت"] },
  { icon: PhoneCall, title: "چگونه با فروشنده تماس بگیرم؟", desc: "در صفحه جزئیات فروشگاه یا کالا، می‌توانید مستقیماً تماس گرفته یا چت را شروع کنید.", kw: ["تماس", "پیام", "چت"] },
  { icon: Navigation, title: "مسیریابی فروشگاه چگونه است؟", desc: "در صفحه فروشگاه روی گزینه مسیریابی کلیک کنید تا آدرس در نرم‌افزارهای نقشه مثل بلد یا نشان باز شود.", kw: ["مسیریابی", "نقشه", "آدرس"] },
  { icon: ReceiptText, title: "چطور تخلف را گزارش کنم؟", desc: "از بخش سه‌نقطه در صفحه کالا یا از طریق چت با پشتیبانی می‌توانید گزارش تخلف خود را ثبت کنید.", kw: ["گزارش", "تخلف", "پشتیبانی"] },
];