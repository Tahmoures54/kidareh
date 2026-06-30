import React, { memo } from "react";
import { motion } from "motion/react";
import { Check, AlertCircle } from "lucide-react";
import { SPRING_TRANSITION } from "../utils";

interface ToastProps {
  message: string;
  type?: "success" | "error";
}

const Toast = memo(({ message, type = "success" }: ToastProps) => (
  <motion.div
    initial={{ opacity: 0, y: -24, scale: 0.95 }} 
    animate={{ opacity: 1, y: 0, scale: 1 }} 
    exit={{ opacity: 0, y: -24, scale: 0.95 }} 
    transition={SPRING_TRANSITION}
    className={`fixed top-[max(16px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] text-white text-sm font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-none ${
      type === "success" ? "bg-slate-900 dark:bg-white dark:text-slate-900" : "bg-rose-600"
    }`}
    dir="rtl"
  >
    {type === "success" ? <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> : <AlertCircle className="w-4 h-4" />}
    {message}
  </motion.div>
));

export default Toast;