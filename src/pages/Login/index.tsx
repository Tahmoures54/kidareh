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
      <div className="presence-root flex h-screen flex-col items-center justify-center" dir="rtl">
        <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--accent)]" />
        <span className="text-sm font-bold text-[var(--muted)]">یه لحظه صبر کن…</span>
      </div>
    );
  }

  return (
    <div className="presence-root min-h-[100dvh]" dir="rtl">
      <div className="mx-auto flex min-h-[100dvh] w-[min(100%,28rem)] flex-col overflow-hidden">
      <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-80 w-80 -translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--gold)]/12 blur-[120px]" />

      <AnimatePresence>
        {state.isSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute top-1/4 left-1/2 z-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[var(--ok)]/20 blur-[120px]"
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

      <main className="z-10 flex w-full flex-1 flex-col justify-center px-8 py-10">
        <div className="mb-10 text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-[32px] bg-[var(--ink)] text-white shadow-xl"
          >
            <motion.div animate={{ y: state.isSuccess ? 0 : [0, -3, 0] }} transition={{ duration: 2, repeat: state.isSuccess ? 0 : Infinity }}>
              {state.isSuccess ? (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.2 }}>
                  <CheckCircle2 className="h-12 w-12 text-white" strokeWidth={2.5} />
                </motion.div>
              ) : state.step === "phone" ? (
                <LockKeyholeOpen className="h-12 w-12 text-white" strokeWidth={2.5} />
              ) : (
                <ShieldCheck className="h-12 w-12 text-white" strokeWidth={2.5} />
              )}
            </motion.div>
          </motion.div>

          <motion.h2
            key={state.step + "-title"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 text-3xl font-black tracking-tight text-[var(--ink)]"
          >
            {state.isSuccess ? "آفرین، وارد شدی" : state.step === "phone" ? "سلام، خوش اومدی" : "کد رو وارد کن"}
          </motion.h2>

          <motion.p
            key={state.step + "-desc"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm font-medium leading-relaxed text-[var(--muted)]"
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

      <footer className="z-10 p-8 text-center">
        <div className="inline-flex items-center justify-center gap-2">
          <Lock className="h-3.5 w-3.5 text-[var(--accent)]" strokeWidth={3} />
          <p className="text-[11px] font-bold text-[var(--muted)]">ورود امن با پیامک — بدون پسورد</p>
        </div>
      </footer>
      </div>
    </div>
  );
}
