import { Link } from "react-router-dom";
import { Search, MapPin, Store, Sparkles, ArrowLeft } from "lucide-react";

export default function PresenceHome() {
  return (
    <main dir="rtl" className="mx-auto w-full max-w-5xl px-4 pb-12 pt-6 sm:px-6">
      <section className="rounded-[2rem] border border-[var(--line)] bg-white px-5 py-8 shadow-sm sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-black text-[var(--muted)]">
            <MapPin className="h-4 w-4" /> خرید حضوری، نزدیک شما
          </div>
          <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-5xl">
            ببین کی داره؛ حضوری بگیر
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-bold leading-7 text-[var(--muted)] sm:text-base">
            کالای موردنظرت را جستجو کن، فروشگاه‌های اطراف و اطلاعات کالا را ببین و قبل از رفتن، موجودی را بررسی کن.
          </p>

          <Link
            to="/search"
            className="mx-auto mt-7 flex min-h-14 max-w-2xl items-center gap-3 rounded-2xl border-2 border-[var(--line)] bg-[var(--surface)] px-4 text-right shadow-sm transition hover:border-[var(--accent)]"
            aria-label="جستجوی کالا"
          >
            <Search className="h-5 w-5 shrink-0 text-[var(--accent)]" />
            <span className="flex-1 text-sm font-black text-[var(--muted)]">مثلاً: روغن موتور، کفش ورزشی، شارژر آیفون...</span>
            <span className="hidden rounded-xl bg-[var(--accent)] px-4 py-2 text-xs font-black text-white sm:inline-flex">جستجو</span>
          </Link>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link to="/search" className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white">
              <Search className="h-4 w-4" /> شروع جستجو
            </Link>
            <Link to="/stores" className="inline-flex items-center gap-2 rounded-xl border border-[var(--line)] px-5 py-3 text-sm font-black">
              <Store className="h-4 w-4" /> دیدن فروشگاه‌ها
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <Feature icon={<Search className="h-5 w-5" />} title="جستجوی سریع" text="کالا را بگو؛ نتایج مرتبط را پیدا کن." />
        <Feature icon={<MapPin className="h-5 w-5" />} title="نزدیک‌ترین گزینه‌ها" text="فروشگاه‌ها را بر اساس موقعیت و محدوده ببین." />
        <Feature icon={<Sparkles className="h-5 w-5" />} title="کمک هوشمند" text="اگر اسم دقیق کالا را نمی‌دانی، از دستیار کمک بگیر." />
      </section>

      <section className="mt-6 rounded-3xl border border-[var(--accent)]/20 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="seller-cta-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 id="seller-cta-title" className="text-base font-black">فروشگاه داری؟ کالاهایت را جلوی خریدارهای اطراف بگذار</h2>
              <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">ثبت فروشندگی رایگان است؛ کالا، قیمت و عکس را اضافه کن تا در جستجوی کی‌داره دیده شوی.</p>
            </div>
          </div>
          <Link
            to="/become-seller"
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-black text-white transition hover:opacity-90"
          >
            ثبت فروشگاه و کالا
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-5 sm:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black">برای پیدا کردن کالا لازم نیست اول ثبت‌نام کنی</h2>
            <p className="mt-1 text-sm font-bold leading-6 text-[var(--muted)]">اول نتیجه را ببین؛ هر وقت لازم شد حساب بساز و امکانات بیشتری مثل ذخیره و دنبال‌کردن را فعال کن.</p>
          </div>
          <Link to="/search" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black shadow-sm">
            جستجو کن <ArrowLeft className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </main>
  );
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface)] text-[var(--accent)]">{icon}</div>
      <h3 className="text-sm font-black">{title}</h3>
      <p className="mt-1 text-xs font-bold leading-6 text-[var(--muted)]">{text}</p>
    </div>
  );
}
