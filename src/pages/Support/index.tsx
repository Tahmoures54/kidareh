import React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight, MessageCircle, Phone, Copy, 
  Sparkles, ShieldCheck, Clock3, HelpCircle,
  Send, LifeBuoy
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { WHATSAPP_NUMBER, SPRING_TRANSITION, FAQS } from "./utils";
import { useSupportLogic } from "./hooks";
import Toast from "./components/Toast";
import FaqItem from "./components/FaqItem";

export default function Support() {
  const navigate = useNavigate();
  const { user } = useAuth() as { user: any };
  
  const { state, setters, actions } = useSupportLogic(user);

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] pb-[max(32px,env(safe-area-inset-bottom))] font-sans relative overflow-hidden" dir="rtl">
      <AnimatePresence>
        {state.toast && <Toast message={state.toast.text} type={state.toast.type} />}
      </AnimatePresence>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/3" />

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-5 pt-[max(16px,env(safe-area-inset-top))] pb-3 transition-colors">
        <div className="flex items-center gap-3">
          <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-[20px] flex items-center justify-center active:scale-90 transition-transform shrink-0">
            <ArrowRight className="w-5 h-5 text-slate-700 dark:text-slate-200" />
          </motion.button>
          <div>
            <h1 className="text-[15px] font-black text-slate-900 dark:text-white flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-indigo-500" /> مرکز پشتیبانی
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold tracking-wide mt-0.5">پاسخ‌گویی سریع از طریق واتساپ</p>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="px-5 py-6 space-y-6 max-w-md mx-auto relative z-10">
        
        {/* Premium Hero Card */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_TRANSITION} className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 rounded-[32px] p-6 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
          <div className="absolute -top-20 -left-20 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-[20px] flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                <Sparkles className="w-6 h-6 text-white drop-shadow-md" />
              </div>
              <div>
                <p className="text-[15px] font-black tracking-tight">چگونه می‌توانیم کمک کنیم؟</p>
                <p className="text-[11px] text-white/80 font-bold mt-0.5">همیشه در کنار شما هستیم</p>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-white/90 font-medium mb-5">
              اگر درباره ثبت فروشگاه، ثبت کالا، پرداخت یا خطاهای سیستم سوال دارید، مستقیماً به ما پیام دهید تا در سریع‌ترین زمان بررسی شود.
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm"><Clock3 className="w-3.5 h-3.5" /> پاسخ‌گویی سریع</span>
              <span className="bg-white/20 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 shadow-sm"><ShieldCheck className="w-3.5 h-3.5" /> پشتیبانی امن</span>
            </div>
          </div>
        </motion.div>

        {/* Contact Bento Grid */}
        <div className="grid grid-cols-1 gap-4">
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_TRANSITION, delay: 0.05 }} className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-[20px] flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-black text-slate-900 dark:text-white mb-0.5">پشتیبانی واتساپ</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono tracking-wider" dir="ltr">{WHATSAPP_NUMBER}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={actions.openWhatsApp} className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[20px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/25">
                <MessageCircle className="w-4 h-4" /> شروع گفتگو
              </button>
              <button onClick={actions.copyNumber} className="w-12 h-12 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-[20px] flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90 transition-transform">
                <Copy className="w-5 h-5" />
              </button>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_TRANSITION, delay: 0.1 }} className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-[20px] flex items-center justify-center">
                <Phone className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-[15px] font-black text-slate-900 dark:text-white mb-0.5">تماس تلفنی</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">فقط در مواقع ضروری</p>
              </div>
            </div>
            <button onClick={actions.callSupport} className="h-12 px-5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-[20px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform border border-blue-100 dark:border-blue-500/20">
              <Phone className="w-4 h-4" /> تماس
            </button>
          </motion.div>
        </div>

        {/* Smart Message Composer */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_TRANSITION, delay: 0.15 }} className="bg-white dark:bg-slate-800 rounded-[32px] border border-slate-100 dark:border-slate-700/50 p-6 shadow-sm">
          <h2 className="text-[15px] font-black text-slate-900 dark:text-white mb-5 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" /> ارسال سریع پیام
          </h2>
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[20px] blur opacity-0 group-focus-within:opacity-20 transition duration-300" />
              <div className="relative bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-[20px] p-2 transition-colors group-focus-within:border-indigo-500/50">
                <input type="text" value={state.subject} onChange={(e) => setters.setSubject(e.target.value)} placeholder="موضوع پیام (مثلاً مشکل در ثبت کالا)" className="w-full h-10 px-2 bg-transparent text-sm font-bold outline-none text-slate-900 dark:text-white placeholder:text-slate-400" />
              </div>
            </div>
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-violet-500 rounded-[24px] blur opacity-0 group-focus-within:opacity-20 transition duration-300" />
              <div className="relative bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700/50 rounded-[24px] p-2 transition-colors group-focus-within:border-indigo-500/50">
                <textarea value={state.message} onChange={(e) => setters.setMessage(e.target.value)} rows={4} placeholder="مشکل یا سوال خود را با جزئیات بنویسید..." className="w-full px-2 py-2 bg-transparent text-sm font-medium outline-none resize-none text-slate-900 dark:text-white placeholder:text-slate-400 leading-relaxed" />
              </div>
            </div>
            <button type="button" onClick={actions.openWhatsApp} className="w-full h-14 bg-slate-900 dark:bg-indigo-600 text-white rounded-[22px] font-black text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-xl">
              <Send className="w-4 h-4" /> ارسال پیام در واتساپ
            </button>
          </div>
        </motion.div>

        {/* FAQs */}
        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SPRING_TRANSITION, delay: 0.2 }}>
          <div className="flex items-center gap-2 mb-4 px-2">
            <HelpCircle className="w-5 h-5 text-indigo-500" />
            <h2 className="text-[15px] font-black text-slate-900 dark:text-white">سوالات پرتکرار</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((item, i) => <FaqItem key={item.q} question={item.q} answer={item.a} defaultOpen={i === 0} />)}
          </div>
        </motion.div>

        {/* Footer Warning */}
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-[24px] p-5">
          <p className="text-xs text-amber-800 dark:text-amber-300 font-medium leading-loose text-center">
            جهت تسریع در پیگیری موارد مالی، لطفاً <span className="font-black bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">شماره موبایل حساب</span> و <span className="font-black bg-amber-100 dark:bg-amber-500/20 px-1.5 py-0.5 rounded">اسکرین‌شات خطا</span> را ارسال نمایید.
          </p>
        </div>
      </main>
    </div>
  );
}