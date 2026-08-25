import React, { useCallback, useRef, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Loader2, Smartphone, AlertCircle } from "lucide-react";

import { useAuth } from "../../context/AuthContext";

/* ====================== UTILS ====================== */

const toEn = (v: string) =>
  v.replace(/[۰-۹]/g, (d) => "۰۱۲۳۴۵۶۷۸۹".indexOf(d).toString())
    .replace(/[٠-٩]/g, (d) => "٠١٢٣٤٥٦٧٨٩".indexOf(d).toString());

const validatePhone = (p: string) => /^09\d{9}$/.test(toEn(p).replace(/\D/g, ""));

/* ====================== COMPONENT ====================== */

interface PhoneInputScreenProps {
  onPhoneVerified: (phone: string) => void;
}

export default function PhoneInputScreen({ onPhoneVerified }: PhoneInputScreenProps) {
  const { sendOtp } = useAuth();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const handlePhoneSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePhone(phone)) {
      setError("شماره تلفن معتبر نیست. با 09 شروع کنید.");
      return;
    }

    setLoading(true);
    try {
      await sendOtp(toEn(phone));
      if (isMountedRef.current) {
        onPhoneVerified(toEn(phone));
      }
    } catch (err: any) {
      if (isMountedRef.current) {
        setError(err?.message || "خطایی رخ داد. لطفاً دوباره تلاش کنید.");
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [phone, sendOtp, onPhoneVerified]);

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Background Halos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 z-10">
        <h1 className="text-lg font-black text-gray-900 dark:text-white">شماره تماس</h1>
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          aria-label="بازگشت"
        >
          <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-8 w-full z-10 py-10">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-[28px] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/30"
          >
            <Smartphone className="w-10 h-10 text-white" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-gray-900 dark:text-white mb-3"
          >
            شماره تلفن خود را وارد کنید
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 dark:text-gray-400"
          >
            برای ادامه فعالیت، ابتدا شماره تلفن خود را تأیید کنید
          </motion.p>
        </div>

        <motion.form
          onSubmit={handlePhoneSubmit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col gap-6"
        >
          {/* Phone Input */}
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
                  disabled={loading}
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

          {/* Submit Button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading || !validatePhone(phone)}
            className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <motion.div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>در حال ارسال...</span>
              </motion.div>
            ) : (
              <motion.div className="flex items-center gap-3">
                دریافت کد تایید
                <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </motion.div>
            )}
          </motion.button>
        </motion.form>
      </main>
    </div>
  );
}
