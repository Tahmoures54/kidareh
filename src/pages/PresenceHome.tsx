import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, ChevronLeft, MapPin, Search, Store,
  Navigation, Bookmark, Sparkles, Users, Package
} from "lucide-react";
import { analytics } from "../utils/analytics";

const quickLinks = [
  { to: "/search", label: "جستجوی کالا", icon: Search, color: "from-cyan-500 to-teal-600" },
  { to: "/explore", label: "اطراف من", icon: Navigation, color: "from-sky-500 to-blue-600" },
  { to: "/stores", label: "فروشگاه‌ها", icon: Store, color: "from-indigo-500 to-violet-600" },
  { to: "/saved", label: "نشان‌ها", icon: Bookmark, color: "from-amber-500 to-orange-600" },
];

const examples = ["روغن موتور", "کفش ورزشی", "شارژر آیفون", "لوازم خودرو", "هدفون", "باتری"];

const stats = [
  { icon: Store, value: "۲٬۴۰۰+", label: "فروشگاه فعال" },
  { icon: Package, value: "۱۸٬۰۰۰+", label: "کالای موجود" },
  { icon: Users, value: "۹۵٪", label: "رضایت کاربران" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function PresenceHome() {
  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6 lg:pt-6">
      {/* ─── HERO ─── */}
      <motion.section
        initial="hidden"
        animate="show"
        className="relative overflow-hidden rounded-[32px] border border-cyan-100/80 bg-white shadow-[0_8px_40px_-12px_rgba(14,116,144,0.18)]"
      >
        {/* Animated blobs */}
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-400/25 to-teal-300/10 blur-3xl animate-pulse" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-40 -left-28 h-80 w-80 rounded-full bg-gradient-to-tr from-sky-400/20 to-blue-300/10 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute top-1/2 left-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-teal-200/10 blur-3xl" aria-hidden="true" />

        <div className="relative grid gap-8 px-5 py-9 sm:px-8 sm:py-11 lg:grid-cols-[1.2fr_.8fr] lg:items-center lg:px-12 lg:py-14">
          <div>
            <motion.div
              custom={0}
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-200/60 bg-cyan-50/80 px-3.5 py-1.5 text-xs font-black text-cyan-700 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-500" />
              </span>
              <MapPin className="h-3.5 w-3.5" />
              خرید حضوری، نزدیک شما
            </motion.div>

            <motion.h1
              custom={1}
              variants={fadeUp}
              className="mt-5 max-w-2xl text-[2.1rem] font-black leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.4rem]"
            >
              ببین کی داره،
              <span className="mt-1 block bg-gradient-to-l from-cyan-600 via-teal-500 to-sky-500 bg-clip-text text-transparent">
                حضوری بگیر.
              </span>
            </motion.h1>

            <motion.p
              custom={2}
              variants={fadeUp}
              className="mt-5 max-w-xl text-sm font-bold leading-7 text-slate-500 sm:text-base"
            >
              کالای موردنظرت را پیدا کن، فروشگاه نزدیک را ببین و قبل از راه افتادن از موجودی و قیمت مطمئن شو.
            </motion.p>

            {/* Smart Search */}
            <motion.div custom={3} variants={fadeUp}>
              <Link
                to="/search"
                aria-label="جستجوی کالا"
                className="group mt-7 flex min-h-[4.25rem] w-full max-w-2xl items-center gap-3 rounded-2xl border-2 border-slate-200/80 bg-slate-50/80 px-4 shadow-sm backdrop-blur transition-all duration-300 hover:border-cyan-400 hover:bg-white hover:shadow-[0_0_0_4px_rgba(8,145,178,0.12)] focus:outline-none"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/30 transition group-hover:scale-105">
                  <Search className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-slate-800">چه کالایی می‌خواهی؟</span>
                  <span className="mt-0.5 block truncate text-xs font-bold text-slate-400">
                    مثلاً روغن موتور، کفش ورزشی یا شارژر آیفون
                  </span>
                </span>
                <span className="hidden items-center gap-1.5 rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 px-5 py-2.5 text-xs font-black text-white shadow-md sm:inline-flex">
                  جستجو
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
              </Link>

              <div className="mt-3.5 flex max-w-2xl flex-wrap gap-2">
                {examples.map((item, i) => (
                  <motion.div key={item} custom={4 + i * 0.3} variants={fadeUp}>
                    <Link
                      to={"/search?q=" + encodeURIComponent(item)}
                      className="rounded-full border border-slate-200 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold text-slate-500 backdrop-blur transition-all hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-700 hover:shadow-sm"
                    >
                      {item}
                    </Link>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right panel – Journey */}
          <motion.div custom={2} variants={fadeUp} className="hidden lg:block">
            <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-b from-slate-50 to-white p-6 shadow-inner">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-cyan-600">مسیر ساده خرید</p>
                  <p className="mt-1 text-lg font-black text-slate-800">از جستجو تا فروشگاه</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-500/25">
                  <Navigation className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {[
                  ["۱", "کالا را جستجو کن", "نام یا عبارت ساده کافی است"],
                  ["۲", "گزینه‌های اطراف را مقایسه کن", "فروشگاه و فاصله را ببین"],
                  ["۳", "حضوری تهیه کن", "با اطلاعات کامل راه بیفت"],
                ].map(([n, title, text], i) => (
                  <motion.div
                    key={n}
                    custom={3 + i}
                    variants={fadeUp}
                    className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3.5 transition hover:border-cyan-200 hover:shadow-md"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-sm font-black text-cyan-600 transition group-hover:bg-cyan-500 group-hover:text-white">
                      {n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-800">{title}</p>
                      <p className="mt-0.5 text-xs font-bold text-slate-400">{text}</p>
                    </div>
                    <ChevronLeft className="mr-auto h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-cyan-500" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ─── QUICK LINKS ─── */}
      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="دسترسی سریع">
        {quickLinks.map(({ to, label, icon: Icon, color }, i) => (
          <motion.div key={to} custom={i} variants={fadeUp} initial="hidden" animate="show">
            <Link
              to={to}
              className="group relative flex min-h-[5.5rem] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-xl"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 transition-opacity duration-300 group-hover:opacity-100`} />
              <span className={`relative z-10 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg transition group-hover:scale-110 group-hover:shadow-none`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="relative z-10 text-sm font-black text-slate-700 transition group-hover:text-white">
                {label}
              </span>
            </Link>
          </motion.div>
        ))}
      </section>

      {/* ─── LIVE STATS ─── */}
      <section className="mt-8 grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, value, label }, i) => (
          <motion.div
            key={label}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="flex flex-col items-center rounded-2xl border border-slate-100 bg-white/80 px-3 py-4 shadow-sm backdrop-blur"
          >
            <Icon className="mb-2 h-5 w-5 text-cyan-600" />
            <span className="text-lg font-black text-slate-800 sm:text-xl">{value}</span>
            <span className="mt-0.5 text-[10px] font-bold text-slate-400 sm:text-xs">{label}</span>
          </motion.div>
        ))}
      </section>

      {/* ─── WHY KIDAREH ─── */}
      <section className="mt-10" aria-labelledby="value-title">
        <div className="mb-4 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black text-cyan-600">چرا کی‌داره؟</p>
            <h2 id="value-title" className="mt-1 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              برای خرید حضوری، کوتاه و کاربردی
            </h2>
          </div>
          <Link
            to="/search"
            className="hidden items-center gap-1 text-xs font-black text-cyan-600 transition hover:text-cyan-700 sm:inline-flex"
          >
            شروع جستجو <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: <Search className="h-5 w-5" />,
              title: "پیدا کردن سریع",
              text: "کالا را با عبارت ساده جستجو کن و فوری به گزینه‌های مرتبط برس.",
            },
            {
              icon: <MapPin className="h-5 w-5" />,
              title: "گزینه‌های نزدیک",
              text: "فروشگاه‌ها و محدوده‌های اطراف را برای خرید حضوری بررسی کن.",
            },
            {
              icon: <Sparkles className="h-5 w-5" />,
              title: "دستیار هوشمند",
              text: "اگر اسم دقیق کالا را نمی‌دانی، از AI برای پیدا کردن مسیر بهتر کمک بگیر.",
            },
          ].map((f, i) => (
            <motion.article
              key={f.title}
              custom={i}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              className="group rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 transition group-hover:bg-cyan-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-cyan-500/30">
                {f.icon}
              </div>
              <h3 className="text-sm font-black text-slate-800">{f.title}</h3>
              <p className="mt-1.5 text-xs font-bold leading-6 text-slate-400">{f.text}</p>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ─── SELLER CTA ─── */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mt-10 overflow-hidden rounded-3xl border border-cyan-200/50 bg-gradient-to-l from-cyan-600 via-teal-600 to-sky-600 shadow-xl shadow-cyan-500/20"
        aria-labelledby="seller-cta-title"
      >
        <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <h2 id="seller-cta-title" className="text-base font-black text-white sm:text-lg">
                فروشگاهت را ثبت کن؛ مشتری‌های اطرافت پیدایت کنند
              </h2>
              <p className="mt-1.5 text-sm font-bold leading-6 text-cyan-100">
                کالاهایت را اضافه کن تا خریدارهای اطراف راحت‌تر پیدایت کنند.
              </p>
            </div>
          </div>
          <Link
            to="/become-seller"
            onClick={() =>
              analytics.trackEvent({
                name: "seller_registration_click",
                category: "growth",
                label: "home_cta",
              })
            }
            className="relative inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-black text-cyan-700 shadow-lg transition hover:bg-cyan-50 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-white/30"
          >
            ثبت فروشگاه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </motion.section>

      <p className="mt-8 text-center text-xs font-bold text-slate-400">
        برای پیدا کردن کالا لازم نیست اول ثبت‌نام کنی.
      </p>
    </main>
  );
}
