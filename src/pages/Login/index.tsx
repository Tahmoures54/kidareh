import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, LockKeyholeOpen, ShieldCheck, Lock, CheckCircle2 } from "lucide-react";

import { useLoginLogic } from "./hooks";
import FloatingParticles from "./components/FloatingParticles";
import { MiniHeader } from "./components/Shared";
import StepPhone from "./components/StepPhone";
import StepOTP from "./components/StepOTP";

export default function Login() {
  const { state, setters, actions } = useLoginLogic();

  if (state.authLoading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500 dark:text-cyan-400 mb-4" />
        <span className="text-sm font-bold text-slate-400">یه لحظه صبر کن…</span>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans shadow-2xl" dir="rtl">
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <AnimatePresence>
        {state.isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/20 blur-[120px] rounded-full pointer-events-none z-0"
          />
        )}
      </AnimatePresence>

      <FloatingParticles />

      <MiniHeader
        showBack={state.step === "otp" && !state.isSuccess}
        onBack={() => {
          setters.setStep("phone");
          setters.setOtp("");
          setters.setError("");
        }}
      />

      <main className="flex-1 flex flex-col justify-center px-8 w-full z-10 py-10">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: state.isSuccess ? 0 : state.step === "phone" ? 0 : 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-24 h-24 bg-gradient-to-br from-cyan-400 via-teal-400 to-violet-500 rounded-[32px] flex items-center justify-center shadow-2xl shadow-cyan-500/40 mx-auto mb-6 relative"
          >
            <motion.div animate={{ y: state.isSuccess ? 0 : [0, -3, 0] }} transition={{ duration: 2, repeat: state.isSuccess ? 0 : Infinity }}>
              {state.isSuccess ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}>
                  <CheckCircle2 className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={2.5} />
                </motion.div>
              ) : state.step === "phone" ? (
                <LockKeyholeOpen className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={2.5} />
              ) : (
                <ShieldCheck className="w-12 h-12 text-white drop-shadow-lg" strokeWidth={2.5} />
              )}
            </motion.div>
          </motion.div>

          <motion.h2
            key={state.step + "-title"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-slate-900 dark:text-white mb-3 tracking-tight"
          >
            {state.isSuccess ? "آفرین، وارد شدی 🌿" : state.step === "phone" ? "سلام، خوش اومدی" : "کد رو وارد کن"}
          </motion.h2>

          <motion.p
            key={state.step + "-desc"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed font-medium"
          >
            {state.isSuccess
              ? "داره حسابت آماده می‌شه…"
              : state.step === "phone"
                ? "فقط شماره موبایلت کافیه. یه کد برات می‌فرستیم."
                : "کد ۵ رقمی پیامک‌شده رو بنویس. اگر نرسید، کمی صبر کن و دوباره بفرست."}
          </motion.p>
        </div>

        <AnimatePresence mode="wait">
          {state.step === "phone" ? (
            <StepPhone
              key="phone-step"
              phone={state.phone}
              setPhone={setters.setPhone}
              onSubmit={actions.onPhoneSubmit}
              loading={state.loading}
              error={state.error}
            />
          ) : (
            <StepOTP
              key="otp-step"
              phone={state.phone}
              otp={state.otp}
              onOtpChange={actions.onOtpChange}
              onOtpKey={actions.onOtpKey}
              onOtpPaste={actions.onOtpPaste}
              onSubmit={actions.onOtpSubmit}
              onResend={actions.onPhoneSubmit}
              timer={state.timer}
              loading={state.loading}
              error={state.error}
              isSuccess={state.isSuccess}
              onChangePhone={() => {
                setters.setStep("phone");
                setters.setOtp("");
                setters.setError("");
              }}
            />
          )}
        </AnimatePresence>
      </main>

      <footer className="p-8 text-center z-10">
        <div className="inline-flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5 text-teal-500 dark:text-teal-400" strokeWidth={3} />
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500">ورود امن با پیامک — بدون پسورد</p>
        </div>
      </footer>
    </div>
  );
}
