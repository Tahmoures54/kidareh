import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, UserPlus, ShoppingBag, BellRing } from "lucide-react";

export const GuestView = memo(() => {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6 text-center"
      dir="rtl"
    >
      <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 -translate-y-1/2 translate-x-1/3 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 -translate-x-1/3 translate-y-1/2 rounded-full bg-teal-400/10 blur-3xl" />

      <motion.div
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
        className="relative z-10 mb-10 flex h-32 w-32 items-center justify-center rounded-[2rem] border border-slate-100 bg-white shadow-2xl shadow-cyan-500/15"
      >
        <Heart className="h-16 w-16 fill-cyan-500 text-cyan-500 drop-shadow-md" />
        <motion.div
          animate={{ y: [0, -8, 0], scale: [1, 1.15, 1] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          className="absolute -right-4 -top-4 rounded-full border-4 border-slate-50 bg-gradient-to-l from-cyan-600 to-teal-500 p-2.5 text-white shadow-xl shadow-cyan-500/30"
        >
          <BellRing className="h-5 w-5" />
        </motion.div>
      </motion.div>

      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="mb-3 text-3xl font-black tracking-tight text-slate-900">علاقه‌مندی‌هات</h2>
        <p className="mb-12 max-w-sm text-base font-medium leading-relaxed text-slate-500">
          کالاهایی که دوست داری رو ذخیره کن تا بعداً راحت پیداشون کنی.
        </p>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="relative z-10 w-full max-w-xs space-y-3"
      >
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 py-4 text-sm font-black text-white shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98]"
        >
          <UserPlus className="h-5 w-5" /> ورود سریع
        </Link>
        <Link
          to="/search"
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-800 transition-all active:scale-[0.98]"
        >
          <ShoppingBag className="h-5 w-5" /> بگرد بدون ورود
        </Link>
      </motion.div>
    </div>
  );
});
