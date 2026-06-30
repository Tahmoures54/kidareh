import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle } from "lucide-react"; // استفاده از آیکون‌های مدرن‌تر

interface ToastProps {
  msg: string;
  type?: "error" | "success";
}

const Toast = React.memo(({ msg, type = "error" }: ToastProps) => {
  const isSuccess = type === "success";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      // قرار دادن در مرکز به شکلی که در همه دستگاه‌ها درست رندر شود
      className="fixed top-6 left-0 right-0 mx-auto z-[100] w-[90%] max-w-sm pointer-events-none flex justify-center"
    >
      <div
        className={`pointer-events-auto flex items-center gap-3 px-4 py-3.5 rounded-[20px] shadow-xl backdrop-blur-2xl border ${
          isSuccess
            ? "bg-[var(--brand-primary)]/90 border-[var(--brand-secondary)]/50 shadow-[var(--brand-glow)]"
            : "bg-rose-500/90 border-rose-400/50 shadow-rose-500/20"
        }`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner ${
            isSuccess ? "bg-white/20" : "bg-white/20"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className="w-5 h-5 text-white drop-shadow-md" />
          ) : (
            <AlertCircle className="w-5 h-5 text-white drop-shadow-md" />
          )}
        </div>
        
        <p className="text-white text-sm font-bold flex-1 leading-tight drop-shadow-sm">
          {msg}
        </p>
      </div>
    </motion.div>
  );
});

export default Toast;