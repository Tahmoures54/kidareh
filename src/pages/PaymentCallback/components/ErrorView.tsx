import React from "react";
import { motion } from "motion/react";
import { XCircle, AlertCircle, LifeBuoy, RefreshCw } from "lucide-react";
import { MAX_RETRY } from "../utils";
import { friendlyError } from "../../../utils/friendlyError";

interface Props {
  msg: string;
  code: string;
  retry: () => void;
  retryCount: number;
  onSupport: () => void;
}

const ErrorView = ({ msg, code, retry, retryCount, onSupport }: Props) => (
  <motion.div
    key="error"
    initial={{ opacity: 0, y: 20, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl shadow-rose-500/10 border border-gray-100 dark:border-gray-800 w-full max-w-sm text-center"
    dir="rtl"
  >
    <motion.div
      initial={{ scale: 0, rotate: 20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 200, damping: 14, delay: 0.1 }}
      className="w-24 h-24 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-[2rem] shadow-xl shadow-rose-500/30 flex items-center justify-center mx-auto mb-6 border-4 border-white dark:border-gray-900"
    >
      <XCircle className="w-12 h-12" />
    </motion.div>

    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-4 tracking-tight">پرداخت انجام نشد</h2>

    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 text-right mb-5 flex items-start gap-3 shadow-sm">
      <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
      <p className="text-[13px] text-rose-800 dark:text-rose-300 font-bold leading-relaxed">
        {friendlyError(msg, "اگر پول از حسابت کم شد، به پشتیبانی بگو تا چک کنیم.")}
      </p>
    </div>

    {code && (
      <div className="bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 mb-6 flex justify-between items-center text-sm shadow-inner">
        <span className="text-gray-500 dark:text-gray-400 font-bold">کد پیگیری:</span>
        <code className="font-mono font-black text-gray-900 dark:text-white tracking-widest">{code}</code>
      </div>
    )}

    <div className="flex gap-3 mb-2">
      <button type="button" onClick={onSupport} className="flex-1 h-14 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-sm flex items-center justify-center gap-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 active:scale-[0.98] transition-all shadow-sm">
        <LifeBuoy className="w-5 h-5" /> پشتیبانی
      </button>
      <button type="button" onClick={retry} disabled={retryCount >= MAX_RETRY} className="flex-[1.5] h-14 bg-indigo-600 dark:bg-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/20">
        <RefreshCw className="w-5 h-5" /> دوباره امتحان کن
      </button>
    </div>

    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold h-4">
      {retryCount > 0 ? `تلاش ${retryCount} از ${MAX_RETRY}` : ""}
      {retryCount >= MAX_RETRY && " دیگه نمی‌شه. از پشتیبانی کمک بگیر."}
    </p>
  </motion.div>
);

export default ErrorView;
