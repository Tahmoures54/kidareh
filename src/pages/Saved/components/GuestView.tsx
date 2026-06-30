import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, UserPlus, ShoppingBag, BellRing } from "lucide-react";

export const GuestView = memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/50 via-white to-white dark:from-gray-950 dark:via-gray-950 dark:to-gray-900 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden" dir="rtl">
      <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-200/20 dark:bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-200/20 dark:bg-rose-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />
      
      <motion.div 
        initial={{ scale: 0.5, opacity: 0, rotate: -15 }} 
        animate={{ scale: 1, opacity: 1, rotate: 0 }} 
        transition={{ type: "spring", bounce: 0.4, delay: 0.1 }}
        className="relative z-10 w-32 h-32 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-[2rem] shadow-2xl shadow-indigo-500/10 flex items-center justify-center mb-10"
      >
        <Heart className="w-16 h-16 fill-rose-500 text-rose-500 drop-shadow-md" />
        <motion.div 
          animate={{ y: [0, -8, 0], scale: [1, 1.15, 1] }} 
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }} 
          className="absolute -top-4 -right-4 bg-indigo-600 text-white rounded-full p-2.5 shadow-xl shadow-indigo-500/40 border-4 border-white dark:border-gray-950"
        >
          <BellRing className="w-5 h-5" />
        </motion.div>
      </motion.div>
      
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-3 tracking-tight">
          لیست علاقه‌مندی‌ها
        </h2>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-12 max-w-sm leading-relaxed font-medium">
          کالاهای محبوبت رو ذخیره کن تا هر زمان قیمت‌ها کاهش یافت، فوراً باخبرت کنیم!
        </p>
      </motion.div>
      
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="space-y-4 w-full max-w-xs relative z-10">
        <Link to="/login" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/30 active:scale-[0.98] transition-all">
          <UserPlus className="w-5 h-5" /> ورود به حساب کاربری
        </Link>
        <Link to="/search" className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 border border-gray-200 dark:border-gray-700 active:scale-[0.98] transition-all">
          <ShoppingBag className="w-5 h-5" /> مرور کالاها بدون ورود
        </Link>
      </motion.div>
    </div>
  );
});