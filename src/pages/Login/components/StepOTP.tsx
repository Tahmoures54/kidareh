import React, { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion"; // اگر پکیج شما motion/react است، تغییر دهید
import { Clock, RefreshCw, Loader2 } from "lucide-react";

import { CONFIG } from "../utils";
import { ErrorToast } from "./Shared";

interface StepOTPProps {
  phone: string;
  otp: string;
  onOtpChange: (i: number, v: string, refs: React.MutableRefObject<HTMLInputElement[]>) => void;
  onOtpKey: (i: number, e: React.KeyboardEvent<HTMLInputElement>, refs: React.MutableRefObject<HTMLInputElement[]>) => void;
  onOtpPaste: (e: React.ClipboardEvent<HTMLInputElement>, refs: React.MutableRefObject<HTMLInputElement[]>) => void;
  onSubmit: () => Promise<void>;
  onResend: () => Promise<void>;
  timer: number;
  loading: boolean;
  error: string;
  onChangePhone: () => void;
}

const StepOTP = memo(({ 
  phone, otp, onOtpChange, onOtpKey, onOtpPaste, 
  onSubmit, onResend, timer, loading, error, onChangePhone 
}: StepOTPProps) => {
  const otpRefs = useRef<HTMLInputElement[]>([]);

  // فوکوس خودکار روی اینپوت خالی بعدی
  useEffect(() => {
    const nextEmptyIndex = otp.length < CONFIG.OTP_LENGTH ? otp.length : CONFIG.OTP_LENGTH - 1;
    otpRefs.current[nextEmptyIndex]?.focus();
  }, [otp]);

  return (
    <motion.form 
      onSubmit={(e) => { 
        e.preventDefault(); 
        if (!loading && otp.length >= CONFIG.OTP_LENGTH) onSubmit(); 
      }}
      initial={{ opacity: 0, x: 20 }} 
      animate={{ opacity: 1, x: 0 }} 
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/50">
          <span className="text-sm font-black text-slate-700 dark:text-slate-300" dir="ltr">{phone}</span>
          <button 
            type="button" 
            onClick={onChangePhone} 
            className="text-[10px] font-black text-cyan-600 dark:text-cyan-400 border-r border-slate-300 dark:border-slate-600 pr-2 mr-1 transition-colors hover:text-violet-500"
          >
            تغییر
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3" dir="ltr">
        {Array.from({ length: CONFIG.OTP_LENGTH }).map((_, i) => (
          <motion.div
            key={i}
            animate={{ scale: otp[i] ? [1, 1.1, 1] : 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <input
              ref={el => { if(el) otpRefs.current[i] = el; }}
              type="tel" 
              maxLength={1} 
              value={otp[i] || ""}
              onChange={e => onOtpChange(i, e.target.value, otpRefs)}
              onKeyDown={e => onOtpKey(i, e, otpRefs)}
              onPaste={i === 0 ? e => onOtpPaste(e, otpRefs) : undefined}
              className={`w-14 h-20 text-center text-2xl font-black rounded-[22px] transition-all duration-200 border-2 outline-none
                ${otp[i] 
                  ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 shadow-lg shadow-cyan-500/10" 
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-400"}`}
            />
          </motion.div>
        ))}
      </div>

      <ErrorToast error={error} />

      <div className="flex flex-col gap-4">
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }} 
          disabled={loading || otp.length < CONFIG.OTP_LENGTH}
          className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:shadow-none"
        >
          {loading ? (
            <motion.div layoutId="btn-loader-otp" className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> <span>در حال بررسی...</span>
            </motion.div>
          ) : (
            <motion.div layoutId="btn-loader-otp">تایید و ورود</motion.div>
          )}
        </motion.button>

        <div className="flex flex-col items-center gap-4">
          {timer > 0 ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Clock className="w-3.5 h-3.5" /> 
              <span>ارسال مجدد کد در {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </div>
          ) : (
            <button 
              type="button" 
              onClick={onResend} 
              className="text-xs font-black text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5 hover:text-violet-500 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> ارسال دوباره کد
            </button>
          )}
        </div>
      </div>
    </motion.form>
  );
});

export default StepOTP;