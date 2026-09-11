import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, AlertCircle } from "lucide-react";

export const MiniHeader = memo(({ onBack, showBack }: { onBack: () => void; showBack: boolean }) => (
  <div className="absolute inset-x-0 top-0 z-30 grid grid-cols-3 items-center p-5">
    <div>
      {showBack ? (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--line)] bg-white/80 shadow-sm backdrop-blur-xl"
          aria-label="بازگشت"
        >
          <ChevronRight className="h-5 w-5 text-[var(--ink-soft)]" />
        </motion.button>
      ) : null}
    </div>
    <div className="flex justify-center">
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--line)] bg-white/70 px-3 py-1.5 backdrop-blur-md">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--ink)] text-[10px] font-black text-white">کی</div>
        <span className="text-xs font-black text-[var(--ink)]">کی‌داره</span>
      </div>
    </div>
    <div />
  </div>
));

export const ErrorToast = memo(({ error }: { error: string }) => (
  <AnimatePresence>
    {error && (
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1, x: [0, -8, 8, -4, 4, 0] }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 shadow-sm"
      >
        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
        </motion.div>
        <p className="flex-1 text-xs font-bold text-rose-900">{error}</p>
      </motion.div>
    )}
  </AnimatePresence>
));
