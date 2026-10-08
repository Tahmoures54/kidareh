import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  User,
  Store,
  Settings,
  LogOut,
  ChevronLeft,
  Phone,
  Crown,
  BadgeCheck,
  Shield,
  Package,
  MessageCircle,
  Heart,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Profile() {
  const { user, logout, isMarketer } = useAuth();
  const navigate = useNavigate();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "پروفایل من | کی‌داره";
    if (user) checkStoreStatus();
    else setLoading(false);
  }, [user]);

  const checkStoreStatus = async () => {
    try {
      await apiRequest("/api/stores/my/store", { auth: true });
      setHasStore(true);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) setHasStore(false);
      else setHasStore(false);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div
        className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-slate-50 p-6"
        dir="rtl"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/3 translate-x-1/3 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 -translate-x-1/3 translate-y-1/3 rounded-full bg-teal-400/10 blur-3xl" />

        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-50 shadow-xl shadow-cyan-500/10">
          <User className="h-10 w-10 text-cyan-600" />
        </div>
        <h2 className="mb-2 text-xl font-black text-slate-900">اول وارد شو</h2>
        <p className="mb-8 max-w-xs text-center text-sm leading-relaxed text-slate-500">
          برای دیدن پروفایل و علاقه‌مندی‌ها، فقط با شماره موبایل وارد شو.
        </p>
        <Link
          to="/login"
          className="inline-block rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 px-10 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition-all active:scale-95"
        >
          ورود سریع
        </Link>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const isSeller = user.role === "seller" || isAdmin;
  const roleLabel = isAdmin
    ? "مدیر"
    : isSeller
      ? "فروشنده"
      : isMarketer
        ? "بازاریاب"
        : "خریدار";
  const displayName =
    user.name ||
    (isAdmin ? "مدیر" : isSeller ? "فروشنده" : isMarketer ? "بازاریاب" : "دوست عزیز");

  return (
    <div className="min-h-screen bg-slate-50/50 pb-28 font-sans" dir="rtl">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-teal-600 to-sky-700 px-4 pb-20 pt-8 text-white">
        <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/3 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 -translate-x-1/4 translate-y-1/3 rounded-full bg-cyan-300/20 blur-2xl" />

        <div className="relative z-10 mx-auto max-w-2xl">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-black">پروفایل من</h1>
            <button
              type="button"
              onClick={async () => {
                await logout();
                navigate("/");
              }}
              className="rounded-xl border border-white/20 bg-white/10 p-2.5 transition-all hover:bg-white/20 active:scale-90"
              aria-label="خروج"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-white/30 bg-white/20 text-3xl font-black shadow-inner backdrop-blur-sm">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : user.name ? (
                  user.name.charAt(0)
                ) : (
                  "👤"
                )}
              </div>
              {isAdmin && (
                <div className="absolute -bottom-1.5 -right-1.5 rounded-full border-2 border-cyan-600 bg-violet-500 p-1.5 shadow-md">
                  <Shield className="h-4 w-4 text-white" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="mb-1 flex items-center gap-2 truncate text-lg font-black">
                {displayName}
                {isSeller && hasStore && (
                  <BadgeCheck className="h-5 w-5 shrink-0 text-sky-200 drop-shadow-sm" />
                )}
              </h2>
              <p className="flex items-center gap-1.5 text-sm font-medium text-cyan-100 opacity-90">
                <Phone className="h-3.5 w-3.5" />{" "}
                <span dir="ltr">{user.phone || "—"}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto -mt-12 max-w-2xl px-4">
        {/* Quick links */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          {[
            { to: "/saved", icon: Heart, label: "علاقه‌مندی", color: "text-rose-500" },
            { to: "/following", icon: Users, label: "دنبال‌شده‌ها", color: "text-cyan-600" },
            { to: "/messages", icon: MessageCircle, label: "پیام‌ها", color: "text-teal-500" },
            isSeller
              ? {
                  to: "/seller",
                  icon: Package,
                  label: loading ? "…" : hasStore ? "فروشگاه" : "ساخت",
                  color: "text-emerald-500",
                }
              : {
                  to: "/become-seller",
                  icon: Store,
                  label: "فروشنده شو",
                  color: "text-amber-500",
                },
          ].map((item, i) => (
            <motion.div key={item.to + item.label} custom={i} variants={fadeUp} initial="hidden" animate="show">
              <Link
                to={item.to}
                className="block rounded-2xl border border-slate-100 bg-white p-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-md active:scale-95"
              >
                <item.icon className={`mx-auto mb-2 h-6 w-6 ${item.color}`} />
                <span className="block text-[11px] font-bold text-slate-500">{item.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="space-y-3">
          {/* Referral */}
          <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show">
            <Link
              to="/referral"
              className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-gradient-to-l from-emerald-50 to-green-50 p-4 shadow-sm transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                  <Users className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-emerald-900">
                    {isMarketer ? "پنل بازاریاب" : "دعوت دوستان"}
                  </h3>
                  <p className="mt-0.5 text-[10px] text-emerald-700">
                    {isMarketer ? "کد دعوت، موجودی و برداشت" : "معرفی کن و جایزه بگیر"}
                  </p>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-emerald-400" />
            </Link>
          </motion.div>

          {/* Seller store status */}
          {isSeller && !loading && (
            <>
              {!hasStore ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-4 rounded-2xl border border-amber-200 bg-gradient-to-l from-amber-50 to-orange-50 p-4 shadow-sm"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                    <Store className="h-6 w-6 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="mb-1 text-sm font-bold text-amber-900">فروشگاهت هنوز ساخته نشده</h3>
                    <p className="text-[10px] leading-relaxed text-amber-700">
                      اول فروشگاه بساز، بعد کالا بگذار
                    </p>
                  </div>
                  <Link
                    to="/complete-profile"
                    className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-[11px] font-black text-white shadow-md transition active:scale-95"
                  >
                    ساخت فروشگاه
                  </Link>
                </motion.div>
              ) : (
                <Link
                  to="/seller"
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-cyan-200 active:scale-[0.98]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-50">
                      <Store className="h-6 w-6 text-cyan-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">فروشگاه من</h3>
                      <p className="mt-0.5 text-[10px] text-slate-500">کالاها و آمار فروشگاه</p>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-slate-400" />
                </Link>
              )}
            </>
          )}

          {!isSeller && (
            <Link
              to="/become-seller"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-cyan-200 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <Crown className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">فروشنده شو</h3>
                  <p className="mt-0.5 text-[10px] text-slate-500">مغازه‌ات رو رایگان ثبت کن</p>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-slate-400" />
            </Link>
          )}

          {isSeller && (
            <Link
              to="/buy-badge"
              className="flex items-center justify-between rounded-2xl border border-cyan-200 bg-gradient-to-l from-cyan-50 to-teal-50 p-4 shadow-sm transition active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100">
                  <BadgeCheck className="h-6 w-6 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-cyan-900">خرید برچسب</h3>
                  <p className="mt-0.5 text-[10px] text-cyan-700">بیشتر دیده شو</p>
                </div>
              </div>
              <ChevronLeft className="h-5 w-5 text-cyan-400" />
            </Link>
          )}

          <Link
            to="/support"
            className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-cyan-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Settings className="h-6 w-6 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">پشتیبانی</h3>
                <p className="mt-0.5 text-[10px] text-slate-500">سوال یا مشکل داری؟</p>
              </div>
            </div>
            <ChevronLeft className="h-5 w-5 text-slate-400" />
          </Link>
        </div>

        {/* Account info */}
        <div className="mt-8 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900">
            <User className="h-5 w-5 text-cyan-500" /> اطلاعات حساب
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
              <span className="text-xs font-bold text-slate-500">موبایل</span>
              <span className="text-sm font-black tracking-wider text-slate-900" dir="ltr">
                {user.phone || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 py-2.5">
              <span className="text-xs font-bold text-slate-500">نوع حساب</span>
              <span
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black ${
                  isAdmin
                    ? "bg-violet-50 text-violet-700"
                    : isMarketer
                      ? "bg-amber-50 text-amber-700"
                      : isSeller
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-cyan-50 text-cyan-700"
                }`}
              >
                {roleLabel}
              </span>
            </div>
            {isSeller && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs font-bold text-slate-500">فروشگاه</span>
                <span
                  className={`text-[11px] font-black ${
                    hasStore === null
                      ? "text-slate-400"
                      : hasStore
                        ? "text-emerald-600"
                        : "text-amber-600"
                  }`}
                >
                  {loading ? "داره چک می‌شه…" : hasStore ? "فعال ✅" : "هنوز ساخته نشده"}
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
