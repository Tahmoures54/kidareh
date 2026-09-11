import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, BellRing, UserPlus, ArrowRight } from "lucide-react";
import { motion } from "motion/react";

export default function GuestView() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" dir="rtl">
      <div className="absolute top-1/4 right-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="relative z-10 w-24 h-24 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-500/20 dark:to-emerald-500/5 border border-teal-200 dark:border-teal-500/30 rounded-[2rem] shadow-xl flex items-center justify-center mb-8 rotate-3"
      >
        <MessageCircle className="w-12 h-12 text-teal-700 dark:text-teal-400" />
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1.5 shadow-lg"
        >
          <BellRing className="w-4 h-4" />
        </motion.div>
      </motion.div>

      <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3 tracking-tight z-10">پیام‌هات اینجاست</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-10 max-w-sm leading-relaxed font-medium z-10">
        برای حرف زدن با فروشنده و پرسیدن قیمت، اول وارد شو.
      </p>

      <div className="space-y-4 w-full max-w-sm relative z-10">
        <Link
          to="/login"
          className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-gray-900/20 active:scale-[0.98] transition-all"
        >
          <UserPlus className="w-5 h-5" /> ورود سریع
        </Link>
        <Link
          to="/"
          className="w-full bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-800 active:scale-[0.98] transition-all"
        >
          <ArrowRight className="w-5 h-5" /> برگرد خونه
        </Link>
      </div>
    </div>
  );
}
