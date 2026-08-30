import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store,
  ArrowRight,
  Loader2,
  ShieldCheck,
  TrendingUp,
  Package,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { friendlyError } from "../../utils/friendlyError";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const Benefit = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
  <motion.div
    variants={itemVariants}
    className="flex items-start gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm"
  >
    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
      <Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
    </div>
    <div className="text-right">
      <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{desc}</p>
    </div>
  </motion.div>
);

export default function BecomeSeller() {
  const navigate = useNavigate();
  const { updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("/api/user/become-seller", {
        method: "POST",
        auth: true,
      });

      updateUser({ role: "seller" });
      navigate("/seller", { replace: true });
    } catch (err: unknown) {
      setError(friendlyError(err, "الان نشد. کمی بعد دوباره امتحان کن."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 pb-24 text-slate-900 dark:text-white font-sans"
      dir="rtl"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center mb-8 shadow-xl shadow-indigo-500/20"
      >
        <Store className="w-12 h-12 text-white" />
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-2xl font-black mb-3 text-center"
      >
        می‌خوای فروشنده بشی؟
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-8 text-center leading-relaxed"
      >
        با یه کلیک حسابت فروشنده می‌شه. بعد می‌تونی کالا بذاری تا همسایه‌ها پیدات کنن.
      </motion.p>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md space-y-3 mb-8"
      >
        <Benefit icon={Package} title="کالا بذار" desc="اسم، قیمت و عکس کافیه. بقیه ساده‌ست." />
        <Benefit icon={TrendingUp} title="ببین چقدر دیده شدی" desc="بازدید و تماس‌ها رو توی پنل خودت ببین." />
        <Benefit icon={ShieldCheck} title="بیشتر دیده شو" desc="با برچسب‌های ویژه، کالایت بالاتر می‌آد." />
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold p-3 rounded-xl max-w-md w-full text-center mb-4 flex items-center justify-center gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          {error}
        </motion.div>
      )}

      <div className="w-full max-w-md space-y-3">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={isLoading}
          className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform flex items-center justify-center gap-2 disabled:opacity-70 disabled:active:scale-100"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              داره آماده می‌شه…
            </>
          ) : (
            "فروشنده شو"
          )}
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="w-full h-12 text-slate-400 dark:text-slate-500 font-bold text-sm flex items-center justify-center gap-1 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          بعداً
        </button>
      </div>

      <p className="mt-8 text-[10px] text-slate-400 dark:text-slate-600 max-w-xs text-center leading-relaxed">
        با زدن این دکمه، قوانین فروشندگان رو قبول می‌کنی.
      </p>
    </div>
  );
}
