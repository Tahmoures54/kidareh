import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertCircle, X } from "lucide-react";

interface ToastProps {
  msg: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Toast({ msg, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => onClose(), 3200);
    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 18, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 450, damping: 32 }}
      className={[
        "fixed bottom-20 left-1/2 -translate-x-1/2 z-50",
        "w-[92%] max-w-sm",
        "flex items-center gap-3 px-4 py-3 rounded-3xl shadow-xl border backdrop-blur-xl",
        isSuccess
          ? "bg-emerald-50/90 border-emerald-200 text-emerald-900 dark:bg-emerald-950/70 dark:border-emerald-800/50 dark:text-emerald-100"
          : "bg-rose-50/90 border-rose-200 text-rose-900 dark:bg-rose-950/70 dark:border-rose-800/50 dark:text-rose-100",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      {isSuccess ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}

      <p className="text-sm font-black flex-1 leading-relaxed">{msg}</p>

      <button
        onClick={onClose}
        className="w-9 h-9 rounded-2xl flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition"
        aria-label="بستن"
      >
        <X className="w-4 h-4 opacity-70" />
      </button>
    </motion.div>
  );
}

export { Toast };