import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; // اگر پکیج شما motion/react است، تغییر دهید
import { Smartphone, CheckCircle2, Loader2, ArrowRight } from "lucide-react";

import { validatePhone, toEn } from "../utils";
import { ErrorToast } from "./Shared";

interface StepPhoneProps {
  phone: string;
  setPhone: React.Dispatch<React.SetStateAction<string>>;
  onSubmit: () => Promise<void>;
  loading: boolean;
  error: string;
}

const StepPhone = memo(({ phone, setPhone, onSubmit, loading, error }: StepPhoneProps) => (
  <motion.form 
    onSubmit={(e) => { 
      e.preventDefault(); 
      if (!loading && validatePhone(phone)) onSubmit(); 
    }}
    initial={{ opacity: 0, x: 20 }} 
    animate={{ opacity: 1, x: 0 }} 
    exit={{ opacity: 0, x: -20 }}
    className="flex flex-col gap-6"
  >
    <div className="relative group">
      <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-violet-500 rounded-[24px] blur-md opacity-0 group-focus-within:opacity-30 transition-all duration-500" />
      <div className="relative bg-white dark:bg-slate-800 rounded-[22px] border border-slate-100 dark:border-slate-700/50 p-1.5 transition-colors group-focus-within:border-cyan-300 dark:group-focus-within:border-cyan-700">
        <div className="flex items-center px-4">
          <Smartphone className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-500 transition-colors" />
          <input
            type="tel" 
            inputMode="numeric" 
            value={phone}
            onChange={(e) => setPhone(toEn(e.target.value).replace(/\D/g, "").slice(0, 11))}
            className="flex-1 h-16 bg-transparent border-none focus:ring-0 text-lg font-black tracking-[0.2em] text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 text-center outline-none"
            placeholder="09..." 
            dir="ltr"
          />
          <AnimatePresence>
            {validatePhone(phone) && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <CheckCircle2 className="w-6 h-6 text-teal-500" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <ErrorToast error={error} />

    <div className="flex flex-col gap-3 mt-2">
      <p className="text-[11px] leading-relaxed text-center text-slate-500 dark:text-slate-400 font-medium px-2">
        وارد کردن شماره به منزله پذیرش{" "}
        <Link to="/terms" target="_blank" className="font-bold text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 underline underline-offset-4 transition-colors">
          شرایط استفاده
        </Link>
        {" "}و{" "}
        <Link to="/privacy" target="_blank" className="font-bold text-violet-600 hover:text-violet-500 dark:text-violet-400 underline underline-offset-4 transition-colors">
          حریم خصوصی
        </Link>
        {" "}کی‌داره است.
      </p>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }} 
        disabled={loading || !validatePhone(phone)}
        className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
      >
        {loading ? (
          <motion.div layoutId="btn-loader" className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" /> <span>در حال ارسال...</span>
          </motion.div>
        ) : (
          <motion.div layoutId="btn-loader" className="flex items-center gap-3">
            دریافت کد تایید <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
          </motion.div>
        )}
      </motion.button>
    </div>
  </motion.form>
));

export default StepPhone;