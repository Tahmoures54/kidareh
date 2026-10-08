import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, BellRing, UserPlus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function GuestView() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-50 p-6 text-center"
      dir="rtl"
    >
      <div className="pointer-events-none absolute right-10 top-1/4 h-40 w-40 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-1/4 left-10 h-40 w-40 rounded-full bg-teal-400/10 blur-3xl" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="relative z-10 mb-8 flex h-24 w-24 rotate-3 items-center justify-center rounded-[2rem] border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-50 shadow-xl shadow-cyan-500/15"
      >
        <MessageCircle className="h-12 w-12 text-cyan-600" />
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -right-2 -top-2 rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 p-1.5 text-white shadow-lg"
        >
          <BellRing className="h-4 w-4" />
        </motion.div>
      </motion.div>

      <h2 className="z-10 mb-3 text-2xl font-black tracking-tight text-slate-900">پیام‌هات اینجاست</h2>
      <p className="z-10 mb-10 max-w-sm text-sm font-medium leading-relaxed text-slate-500">
        برای حرف زدن با فروشنده و پرسیدن قیمت، اول وارد شو.
      </p>

      <div className="relative z-10 w-full max-w-sm space-y-3">
        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-cyan-600 to-teal-500 py-4 text-sm font-black text-white shadow-xl shadow-cyan-500/25 transition-all active:scale-[0.98]"
        >
          <UserPlus className="h-5 w-5" /> ورود سریع
        </Link>
        <Link
          to="/"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-4 text-sm font-black text-slate-700 transition-all active:scale-[0.98]"
        >
          <ArrowRight className="h-5 w-5" /> برگرد خونه
        </Link>
      </div>
    </div>
  );
}
