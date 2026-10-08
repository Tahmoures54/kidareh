import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, MapPin, Search, Store, Navigation, Bookmark, Sparkles } from "lucide-react";
import { analytics } from "../utils/analytics";

const quickLinks = [
  { to: "/search", label: "جستجوی کالا", icon: Search },
  { to: "/explore", label: "اطراف من", icon: Navigation },
  { to: "/stores", label: "فروشگاه‌ها", icon: Store },
  { to: "/saved", label: "نشان‌ها", icon: Bookmark },
];

const examples = ["روغن موتور", "کفش ورزشی", "شارژر آیفون", "لوازم خودرو"];

export default function PresenceHome() {
  return (
    <main dir="rtl" className="mx-auto w-full max-w-6xl px-4 pb-12 pt-5 sm:px-6 lg:pt-8">
      <section className="relative overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-sm">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[var(--accent)]/10 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" aria-hidden="true" />

        <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-12 lg:py-12">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/5 px-3 py-1.5 text-xs font-black text-[var(--accent)]">
              <MapPin className="h-4 w-4" />
              خرید حضوری، نزدیک شما
            </div>

            <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.2] tracking-tight text-[var(--ink)] sm:text-5xl lg:text-[3.35rem]">
              ببین کی داره،
              <span className="block text-[var(--accent)]">حضوری بگیر.</span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm font-bold leading-7 text-[var(--muted)] sm:text-base">
              کالای موردنظرت را پیدا کن، فروشگاه نزدیک را ببین و قبل از راه افتادن از موجودی و اطلاعات کالا مطمئن شو.
            </p>

            <Link
              to="/search"
              aria-label="جستجوی کالا"
              className="mt-7 flex min-h-16 w-full max-w-2xl items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4 text-right shadow-sm transition hover:border-[var(--accent)] hover:bg-white focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/10"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
                <Search className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-black text-[var(--ink)]">چه کالایی می‌خواهی؟</span>
                <span className="mt-0.5 block truncate text-xs font-bold text-[var(--muted)]">مثلاً روغن موتور، کفش ورزشی یا شارژر آیفون</span>
              </span>
              <span className="hidden rounded-xl bg-[var(--accent)] px-4 py-2.5 text-xs font-black text-white sm:inline-flex">جستجو</span>
            </Link>

            <div className="mt-3 flex max-w-2xl flex-wrap gap-2">
              {examples.map((item) => (
                <Link
                  key={item}
                  to={"/search?q=" + encodeURIComponent(item)}
                  className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[11px] font-bold text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-[var(--accent)]">مسیر ساده خرید</p>
                  <p className="mt-1 text-lg font-black">از جستجو تا فروشگاه</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[var(--accent)] shadow-sm">
                  <Navigation className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  ["۱", "کالا را جستجو کن", "نام یا عبارت ساده کافی است."],
                  ["۲", "گزینه‌های اطراف را مقایسه کن", "فروشگاه و محدوده را ببین."],
                  ["۳", "حضوری تهیه کن", "با اطلاعات بهتر راه بیفت."],
                ].map(([n, title, text]) => (
                  <div key={n} className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-white p-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-sm font-black text-[var(--accent)]">{n}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black">{title}</p>
                      <p className="mt-0.5 text-xs font-bold text-[var(--muted)]">{text}</p>
                    </div>
                    <ChevronLeft className="mr-auto h-4 w-4 shrink-0 text-[var(--muted)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="دسترسی سریع">
        {quickLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-3 py-3 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--accent)] hover:shadow-md sm:px-4"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)] transition group-hover:bg-[var(--accent)] group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 text-sm font-black">{label}</span>
            <ChevronLeft className="mr-auto h-4 w-4 shrink-0 text-[var(--muted)]" />
          </Link>
        ))}
      </section>

      <section className="mt-8" aria-labelledby="value-title">
        <div className="mb-3 flex items-end justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-black text-[var(--accent)]">چرا کی‌داره؟</p>
            <h2 id="value-title" className="mt-1 text-xl font-black tracking-tight">برای خرید حضوری، کوتاه و کاربردی</h2>
          </div>
          <Link to="/search" className="hidden items-center gap-1 text-xs font-black text-[var(--accent)] sm:inline-flex">
            شروع جستجو <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Feature icon={<Search className="h-5 w-5" />} title="پیدا کردن کالا" text="کالا را با عبارت ساده جستجو کن و سریع به گزینه‌های مرتبط برس." />
          <Feature icon={<MapPin className="h-5 w-5" />} title="دیدن گزینه‌های نزدیک" text="فروشگاه‌ها و محدوده‌های اطراف را برای خرید حضوری بررسی کن." />
          <Feature icon={<Sparkles className="h-5 w-5" />} title="کمک در انتخاب" text="اگر اسم دقیق کالا را نمی‌دانی، از دستیار برای پیدا کردن مسیر بهتر کمک بگیر." />
        </div>
      </section>

      <section className="mt-8 overflow-hidden rounded-3xl border border-[var(--accent)]/20 bg-white shadow-sm" aria-labelledby="seller-cta-title">
        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)]/10 text-[var(--accent)]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 id="seller-cta-title" className="text-base font-black">فروشگاهت را ثبت کن؛ مشتری‌های اطرافت پیدایت کنند</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">فروشگاهت را ثبت کن و کالاهایت را اضافه کن تا خریدارهای اطراف راحت‌تر پیدایت کنند.</p>
            </div>
          </div>
          <Link
            to="/become-seller"
            onClick={() => analytics.trackEvent({ name: "seller_registration_click", category: "growth", label: "home_cta" })}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90 focus:outline-none focus:ring-4 focus:ring-[var(--accent)]/20"
          >
            ثبت فروشگاه
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <p className="mt-6 text-center text-xs font-bold text-[var(--muted)]">
        برای پیدا کردن کالا لازم نیست اول ثبت‌نام کنی.
      </p>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">{icon}</div>
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-1.5 text-xs font-bold leading-6 text-[var(--muted)]">{text}</p>
    </article>
  );
}