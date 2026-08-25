import React, { useCallback, useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

/* ====================== UTILS ====================== */

const toEn = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

const CONFIG = { OTP_LENGTH: 5, TIMER_DURATION: 120 };

/* ====================== COMPONENT ====================== */

interface OTPVerificationScreenProps {
  phone: string;
  onVerified: () => void;
  onBack: () => void;
}

export default function OTPVerificationScreen({ phone, onVerified, onBack }: OTPVerificationScreenProps) {
  const { verifyOtp, sendOtp } = useAuth();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timer, setTimer] = useState(CONFIG.TIMER_DURATION);
  const [canResend, setCanResend] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const otpRefsRef = useRef<HTMLInputElement[]>([]);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Timer Logic
  useEffect(() => {
    if (timer <= 0 || isSuccess) {
      setCanResend(true);
      return;
    }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer, isSuccess]);

  const handleOtpChange = useCallback(
    (i: number, v: string) => {
      if (isSuccess) return;
      const val = toEn(v).replace(/\D/g, "").slice(0, 1);
      const newOtp = otp.split("");
      newOtp[i] = val;
      setOtp(newOtp.join(""));
      if (val && i < CONFIG.OTP_LENGTH - 1) otpRefsRef.current[i + 1]?.focus();
    },
    [otp, isSuccess]
  );

  const handleOtpKey = useCallback((i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      otpRefsRef.current[i - 1]?.focus();
    }
  }, [otp]);

  const handleOtpSubmit = useCallback(async () => {
    if (loading || isSuccess || otp.length !== CONFIG.OTP_LENGTH) return;

    setLoading(true);
    setError("");
    try {
      await verifyOtp(phone, otp);
      if (isMountedRef.current) {
        setIsSuccess(true);
        // Call onVerified after a short delay to show success animation
        setTimeout(() => {
          if (isMountedRef.current) onVerified();
        }, 1000);
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "کد وارد شده صحیح نیست یا منقضی شده است");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [phone, otp, verifyOtp, onVerified, loading, isSuccess]);

  const handleResendOtp = useCallback(async () => {
    if (!canResend) return;
    setError("");
    setLoading(true);
    try {
      await sendOtp(phone);
      if (isMountedRef.current) {
        setTimer(CONFIG.TIMER_DURATION);
        setCanResend(false);
        setOtp("");
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "خطایی در ارسال کد رخ داد");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [phone, canResend, sendOtp]);

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Background Halos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Success Green Halo */}
      <AnimatePresence>
        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 z-10">
        <button
          onClick={onBack}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          aria-label="بازگشت"
        >
          <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <h1 className="text-lg font-black text-gray-900 dark:text-white flex-1">تأیید کد</h1>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-8 w-full z-10 py-10">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className={`w-20 h-20 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl transition-all ${
              isSuccess
                ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30"
                : "bg-gradient-to-br from-cyan-500 to-teal-600 shadow-cyan-500/30"
            }`}
          >
            <AnimatePresence>
              {isSuccess ? (
                <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
              ) : (
                <motion.div key="phone" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                  <AlertCircle className="w-10 h-10 text-white" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-gray-900 dark:text-white mb-3"
          >
            {isSuccess ? "تأیید موفق!" : "کد تأیید را وارد کنید"}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            {isSuccess ? "در حال انتقال..." : `کد ۵ رقمی به شماره ${phone} ارسال شد`}
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* OTP Input Fields */}
          {!isSuccess && (
            <div className="flex justify-center gap-2">
              {Array.from({ length: CONFIG.OTP_LENGTH }).map((_, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    if (el) otpRefsRef.current[i] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otp[i] || ""}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  className="w-12 h-14 text-center text-xl font-black rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                  disabled={loading || isSuccess}
                  dir="ltr"
                />
              ))}
            </div>
          )}

          {/* Error Toast */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Verify Button */}
          {!isSuccess && (
            <motion.button
              type="button"
              onClick={handleOtpSubmit}
              whileTap={{ scale: 0.97 }}
              disabled={loading || otp.length !== CONFIG.OTP_LENGTH}
              className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
            >
              {loading ? (
                <motion.div className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>در حال تأیید...</span>
                </motion.div>
              ) : (
                <motion.div className="flex items-center gap-3">
                  تأیید کد
                  <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </motion.div>
              )}
            </motion.button>
          )}

          {/* Resend Code */}
          {!isSuccess && (
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">کد را دریافت نکردید؟</span>
              {canResend ? (
                <button
                  onClick={handleResendOtp}
                  disabled={loading}
                  className="font-black text-cyan-600 dark:text-cyan-400 hover:text-cyan-700 dark:hover:text-cyan-300 disabled:opacity-50 transition-colors"
                >
                  ارسال مجدد
                </button>
              ) : (
                <span className="font-black text-cyan-600 dark:text-cyan-400">
                  {timer}s
                </span>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
