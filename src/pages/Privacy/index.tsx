import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ITEMS, ANIMATION_VARIANTS } from "./constants";
import PolicyCard from "./components/PolicyCard";
import CommitmentBox from "./components/CommitmentBox";

export default function Privacy() {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 transition-colors pb-28 text-gray-900 dark:text-white" dir="rtl">
      
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-gray-800/60 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(20);
              navigate(-1);
            }}
            className="w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm"
          >
            <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              حریم خصوصی و امنیت
            </h1>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold mt-0.5">
              آخرین بروزرسانی: خرداد ۱۴۰۳
            </p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-2xl mx-auto space-y-5 relative">
        
        {/* ── Hero Banner ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="relative overflow-hidden rounded-[2rem] bg-gray-900 dark:bg-gray-900 p-6 shadow-2xl shadow-gray-900/20 dark:shadow-none"
        >
          <div className="absolute -top-20 -right-20 w-48 h-48 bg-blue-500/30 rounded-full blur-[50px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-indigo-500/20 rounded-full blur-[50px] pointer-events-none" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 mb-4 shadow-inner">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h2 className="text-xl font-black text-white mb-2 tracking-tight">حفاظت از اطلاعات شما</h2>
            <p className="text-xs text-gray-300 leading-relaxed font-medium max-w-sm">
              حریم خصوصی شما برای ما یک اصل غیرقابل مذاکره است. ما فقط داده‌های ضروری را جمع‌آوری می‌کنیم و هرگز آن‌ها را به اشخاص ثالث نمی‌فروشیم.
            </p>
          </div>
        </motion.div>

        {/* ── Policy Cards ── */}
        <motion.div 
          variants={ANIMATION_VARIANTS.container}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {ITEMS.map((item, i) => (
            <PolicyCard key={i} item={item} />
          ))}
        </motion.div>

        {/* ── Commitment Box ── */}
        <CommitmentBox />

        {/* ── Footer ── */}
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          transition={{ delay: 0.8 }}
          className="pt-4 pb-6"
        >
          <p className="text-center text-[10px] text-gray-400 dark:text-gray-500 font-bold">
            کی‌داره — نسخه قوانین ۱.۲<br/>
            محافظت شده با استانداردهای امنیتی روز
          </p>
        </motion.div>

      </main>
    </div>
  );
}