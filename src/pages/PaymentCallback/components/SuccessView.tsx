import React from "react";
import { motion } from "motion/react";
import { CheckCircle2, Sparkles, Receipt, Copy, Check, Home, ArrowRight } from "lucide-react";

interface Props {
  code: string;
  copyDone: boolean;
  onCopy: () => void;
  onHome: () => void;
  onSeller: () => void;
}

const SuccessView = ({ code, copyDone, onCopy, onHome, onSeller }: Props) => (
  <motion.div
    key="success" 
    initial={{ opacity: 0, y: 20, scale: 0.95 }} 
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="w-full max-w-sm" dir="rtl"
  >
    <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-2xl shadow-emerald-500/10 border border-gray-100 dark:border-gray-800 overflow-hidden relative">
      
      <div className="bg-emerald-500 text-white p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
        <motion.div initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }} className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center mx-auto mb-4 border border-white/30 shadow-lg">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-2xl font-black mb-1 flex items-center justify-center gap-2 drop-shadow-sm">
          پرداخت موفقیت‌آمیز <Sparkles className="w-5 h-5 text-emerald-200" />
        </h2>
        <p className="text-emerald-100 text-xs font-medium">سفارش شما با موفقیت ثبت و تأیید شد.</p>
      </div>

      <div className="relative h-6 bg-white dark:bg-gray-900">
        <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8fafc] dark:bg-gray-950 rounded-full shadow-inner border-r border-gray-100 dark:border-gray-800" />
        <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-[#f8fafc] dark:bg-gray-950 rounded-full shadow-inner border-l border-gray-100 dark:border-gray-800" />
        <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 border-b-2 border-dashed border-gray-200 dark:border-gray-800" />
      </div>

      <div className="p-6 pt-2 pb-8">
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 mb-6 space-y-4">
          <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 flex items-center gap-1.5 uppercase tracking-wider">
            <Receipt className="w-3.5 h-3.5" /> جزئیات تراکنش
          </p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-bold">وضعیت:</span>
            <span className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black px-2.5 py-1 rounded-lg text-xs">تأیید شده</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-bold">کد پیگیری:</span>
            <div className="flex items-center gap-2">
              <code className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-mono font-black text-xs px-3 py-1.5 rounded-xl tracking-widest shadow-sm">
                {code}
              </code>
              <button onClick={onCopy} className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-90 transition-all text-gray-600 dark:text-gray-300">
                {copyDone ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onHome} className="flex-[1] h-14 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-sm flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all">
            <Home className="w-5 h-5" />
          </button>
          <button onClick={onSeller} className="flex-[3] h-14 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-gray-900/20 dark:shadow-white/10 active:scale-[0.98] transition-all">
            بازگشت به پنل <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  </motion.div>
);

export default SuccessView;