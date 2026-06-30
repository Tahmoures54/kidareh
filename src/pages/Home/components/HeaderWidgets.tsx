import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, UserPlus, User, Bell, Store as StoreIcon, Bot, ArrowUpRight } from "lucide-react";
import CitySelector from "../../../components/Home/CitySelector";
import { AppUser } from "../constants";

// ============================================================
// Header — هدر اصلی صفحه
// ============================================================
export const Header = memo(({ user, effectiveCity, effectiveDisplay, gpsEnabled, manualLocation, onCityChange }: any) => {
  const isSeller = user?.role === "seller" || user?.role === "admin";
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 glass border-b border-[var(--border-light)]/60 transition-colors">
      <div className="px-5 pt-[max(20px,env(safe-area-inset-top))] pb-3 flex items-center justify-between">
        
        {/* ── لوگو و اطلاعات ── */}
        <div className="flex items-center gap-3">
          <Link to="/">
            <motion.div whileTap={{ scale: 0.9 }} className="relative w-12 h-12 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg shadow-[var(--brand-glow)]">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)]" />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white/20 rounded-full blur-lg" />
              <Sparkles className="w-6 h-6 text-white relative z-10 drop-shadow" />
            </motion.div>
          </Link>
          <div className="flex flex-col">
            <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight leading-none">کی داره؟</h1>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-0.5 leading-none">ببین کی داره؟ حضوری بگیر</p>
            <div className="flex items-center gap-2 mt-1.5">
              <CitySelector selectedCity={effectiveCity} displayLocation={effectiveDisplay} gpsEnabled={gpsEnabled && !manualLocation} onCityChange={onCityChange} variant="default" />
              {gpsEnabled && !manualLocation && (
                <span className="relative flex h-3 w-3 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-secondary)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[var(--brand-primary)] shadow-sm shadow-[var(--brand-glow)]" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── دکمه‌های سمت راست ── */}
        <div className="flex items-center gap-2">
          {isSeller && (
            <motion.div whileTap={{ scale: 0.9 }}>
              <Link to="/seller" className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors">
                <StoreIcon className="w-[18px] h-[18px]" />
              </Link>
            </motion.div>
          )}
          <motion.div whileTap={{ scale: 0.9 }}>
            <button onClick={() => navigate("/messages")} className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--border-light)] transition-colors">
              <Bell className="w-[18px] h-[18px]" />
              <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-[2.5px] ring-[var(--bg-primary)]" />
            </button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.9 }}>
            {!user ? (
              <Link to="/login" className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/20 transition-colors">
                <UserPlus className="w-[18px] h-[18px]" />
              </Link>
            ) : (
              <Link to="/profile" className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-md hover:shadow-lg hover:shadow-[var(--brand-glow)] transition-all">
                <User className="w-[18px] h-[18px]" />
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
});

// ============================================================
// BentoShortcuts — بنرهای هوشمند فروشگاه و AI
// ============================================================
export const BentoShortcuts = memo(({ user }: { user: AppUser | null }) => {
  const isSeller = user?.role === "seller" || user?.role === "admin";
  return (
    <motion.section variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }} className="grid grid-cols-2 gap-3">
      
      {/* ── بنر فروشگاه ── */}
      <Link to={isSeller ? "/seller" : user ? "/complete-profile" : "/login"} className="col-span-2 group relative overflow-hidden rounded-[24px] p-5 text-white active:scale-[0.985] transition-transform">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500" />
        <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-white/15 rounded-full blur-3xl group-hover:scale-125 group-hover:-translate-x-4 group-hover:translate-y-2 transition-all duration-700" />
        <div className="absolute right-12 top-0 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute inset-0 shadow-[inset_0_-2px_20px_rgba(0,0,0,0.1)]" />

        <div className="flex justify-between items-center relative z-10">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-3">
              <StoreIcon className="w-3 h-3" /> ویژه فروشندگان
            </span>
            <h3 className="font-black text-lg leading-tight">{isSeller ? "مدیریت فروشگاه" : "فروشگاه خود را ثبت کنید"}</h3>
            <p className="text-[11px] text-white/80 mt-1 font-medium">{isSeller ? "بررسی آمار و آگهی‌ها" : "ویترین خود را به داخل خانه‌ها ببرید"}</p>
          </div>
          <div className="relative">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[20px] flex items-center justify-center group-hover:scale-105 group-hover:bg-white/20 transition-all duration-300">
              <StoreIcon className="w-7 h-7 drop-shadow-md" />
            </div>
            <ArrowUpRight className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white rounded-full text-orange-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>

      {/* ── بنر دستیار هوشمند ── */}
      <Link to="/ai" className="col-span-2 group relative overflow-hidden rounded-[24px] p-5 text-white active:scale-[0.985] transition-transform">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)] via-cyan-500 to-teal-800" />
        <div className="absolute -right-12 -top-12 w-56 h-56 bg-white/10 rounded-full blur-3xl group-hover:scale-125 group-hover:translate-x-4 group-hover:-translate-y-2 transition-all duration-700" />
        <div className="absolute left-8 bottom-0 w-20 h-20 bg-cyan-300/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500" />
        <div className="absolute inset-0 shadow-[inset_0_-2px_20px_rgba(0,0,0,0.1)]" />

        <div className="flex justify-between items-center relative z-10">
          <div className="flex-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-3 py-1 rounded-full mb-3">
              <Sparkles className="w-3 h-3 text-yellow-300" /> جستجوی جادویی
            </span>
            <h3 className="font-black text-lg leading-tight">دستیار هوشمند</h3>
            <p className="text-[11px] text-white/80 mt-1 font-medium">پیدا کردن کالا با صحبت کردن</p>
          </div>
          <div className="relative">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl border border-white/20 rounded-[20px] flex items-center justify-center group-hover:scale-105 group-hover:bg-white/20 transition-all duration-300">
              <Bot className="w-7 h-7 drop-shadow-md" />
            </div>
            <ArrowUpRight className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-white rounded-full text-teal-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </motion.section>
  );
});