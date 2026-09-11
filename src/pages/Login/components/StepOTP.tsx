import React, { memo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Clock, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";

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
  isSuccess: boolean;
  onChangePhone: () => void;
}

const StepOTP = memo(({
  phone, otp, onOtpChange, onOtpKey, onOtpPaste,
  onSubmit, onResend, timer, loading, error, isSuccess, onChangePhone
}: StepOTPProps) => {
  const otpRefs = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    if (isSuccess) return;
    const nextEmptyIndex = otp.length < CONFIG.OTP_LENGTH ? otp.length : CONFIG.OTP_LENGTH - 1;
    otpRefs.current[nextEmptyIndex]?.focus();
  }, [otp, isSuccess]);

  useEffect(() => {
    if (otp.length === CONFIG.OTP_LENGTH && !loading && !isSuccess) {
      onSubmit();
    }
  }, [otp]);

  return (
    <motion.form
      onSubmit={(e) => { e.preventDefault(); if (!loading && !isSuccess && otp.length >= CONFIG.OTP_LENGTH) onSubmit(); }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-col gap-8"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--paper)] px-4 py-2">
          <span className="text-sm font-black text-[var(--ink)]" dir="ltr">{phone}</span>
          <button
            type="button"
            onClick={onChangePhone}
            disabled={isSuccess || loading}
            className="mr-1 border-r border-[var(--line)] pr-2 text-[10px] font-black text-[var(--accent)] disabled:opacity-50"
          >
            تغییر
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-3" dir="ltr">
        {Array.from({ length: CONFIG.OTP_LENGTH }).map((_, i) => (
          <motion.div
            key={i}
            animate={isSuccess ? "success" : otp[i] ? "filled" : "empty"}
            variants={{
              empty: { scale: 1 },
              filled: { scale: [1, 1.1, 1] },
              success: { scale: [1, 1.2, 1], transition: { delay: i * 0.1 } }
            }}
            transition={{ duration: 0.4 }}
          >
            <input
              ref={el => { if (el) otpRefs.current[i] = el; }}
              type="tel"
              maxLength={1}
              value={otp[i] || ""}
              onChange={e => onOtpChange(i, e.target.value, otpRefs)}
              onKeyDown={e => onOtpKey(i, e, otpRefs)}
              onPaste={i === 0 ? e => onOtpPaste(e, otpRefs) : undefined}
              disabled={isSuccess || loading}
              className={`h-20 w-14 rounded-[22px] border-2 text-center text-2xl font-black outline-none transition-all duration-300
                ${isSuccess
                  ? "border-[var(--ok)] bg-emerald-50 text-[var(--ok)]"
                  : otp[i]
                    ? "border-[var(--accent)] bg-teal-50 text-[var(--accent)]"
                    : "border-[var(--line)] bg-white focus:border-[var(--accent)]"}`}
            />
          </motion.div>
        ))}
      </div>

      <ErrorToast error={error} />

      <div className="flex flex-col gap-4">
        <motion.button
          type="submit"
          whileTap={!isSuccess ? { scale: 0.97 } : {}}
          disabled={loading || otp.length < CONFIG.OTP_LENGTH || isSuccess}
          className={`flex h-16 w-full items-center justify-center gap-2 rounded-[22px] text-base font-black shadow-xl transition-all
            ${isSuccess
              ? "bg-[var(--ok)] text-white"
              : "bg-[var(--accent)] text-white disabled:opacity-40"}`}
        >
          {isSuccess ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6" /> ورود موفق بود
            </motion.div>
          ) : loading ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> در حال بررسی...
            </span>
          ) : (
            <span>تایید و ورود</span>
          )}
        </motion.button>

        <div className="flex flex-col items-center gap-4">
          {timer > 0 && !isSuccess ? (
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--muted)]">
              <Clock className="h-3.5 w-3.5" />
              <span>ارسال مجدد کد در {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, "0")}</span>
            </div>
          ) : !isSuccess && (
            <button
              type="button"
              onClick={onResend}
              className="flex items-center gap-1.5 text-xs font-black text-[var(--accent)]"
            >
              <RefreshCw className="h-3.5 w-3.5" /> ارسال دوباره کد
            </button>
          )}
        </div>
      </div>
    </motion.form>
  );
});

export default StepOTP;
