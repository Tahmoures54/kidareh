import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
      <div className="absolute -inset-1 rounded-[24px] bg-[var(--accent)]/20 blur-md opacity-0 transition-all duration-500 group-focus-within:opacity-100" />
      <div className="relative rounded-[22px] border border-[var(--line)] bg-white p-1.5 transition-colors group-focus-within:border-[var(--accent)]">
        <div className="flex items-center px-4">
          <Smartphone className="h-5 w-5 text-[var(--muted)] transition-colors group-focus-within:text-[var(--accent)]" />
          <input
            type="tel"
            inputMode="numeric"
            value={phone}
            onChange={(e) => setPhone(toEn(e.target.value).replace(/\D/g, "").slice(0, 11))}
            className="h-16 flex-1 border-none bg-transparent text-center text-lg font-black tracking-[0.2em] text-[var(--ink)] outline-none placeholder:text-[var(--muted)]"
            placeholder="09..."
            dir="ltr"
          />
          <AnimatePresence>
            {validatePhone(phone) && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <CheckCircle2 className="h-6 w-6 text-[var(--ok)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>

    <ErrorToast error={error} />

    <div className="mt-2 flex flex-col gap-3">
      <p className="px-2 text-center text-[11px] font-medium leading-relaxed text-[var(--muted)]">
        وارد کردن شماره به منزله پذیرش{" "}
        <Link to="/terms" target="_blank" className="font-bold text-[var(--accent)] underline underline-offset-4">
          شرایط استفاده
        </Link>{" "}
        و{" "}
        <Link to="/privacy" target="_blank" className="font-bold text-[var(--accent)] underline underline-offset-4">
          حریم خصوصی
        </Link>{" "}
        کی‌داره است.
      </p>

      <motion.button
        type="submit"
        whileTap={{ scale: 0.97 }}
        disabled={loading || !validatePhone(phone)}
        className="group flex h-16 w-full items-center justify-center gap-3 rounded-[22px] bg-[var(--accent)] text-base font-black text-white shadow-xl shadow-[var(--accent)]/25 disabled:opacity-40"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" /> در حال ارسال...
          </span>
        ) : (
          <span className="flex items-center gap-3">
            دریافت کد تایید <ArrowRight className="h-5 w-5 rotate-180 transition-transform group-hover:-translate-x-1" />
          </span>
        )}
      </motion.button>
    </div>
  </motion.form>
));

export default StepPhone;
