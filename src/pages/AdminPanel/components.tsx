import React, { useEffect, memo } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Loader2, PackageOpen } from "lucide-react";

export const Toast = memo(({ msg, onDismiss }: { msg: string; onDismiss: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [msg, onDismiss]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -18, scale: 0.96 }}
      className="fixed top-[max(16px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-none"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> {msg}
    </motion.div>
  );
});

export const Loading = memo(() => (
  <div className="flex justify-center py-20">
    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
  </div>
));

export const Empty = memo(({ message, icon: Icon }: { message?: string; icon?: any }) => {
  const displayText = message || "محتوا یافت نشد";
  const IconComponent = Icon || PackageOpen; // آیکون پیش‌فرض در صورت نبودن
  return (
    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[28px] border border-dashed border-slate-200 dark:border-slate-700/50">
      <IconComponent className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{displayText}</p>
    </div>
  );
});

export const StatCard = memo(
  ({ label, value, icon: Icon, color, alert }: any) => (
    <div className="bg-white/10 dark:bg-slate-800/50 backdrop-blur-md rounded-[24px] p-4 border border-white/20 dark:border-slate-700/50 relative overflow-hidden group">
      <div
        className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-[40px] opacity-40 transition-opacity group-hover:opacity-60 ${color.replace(
          "text-",
          "bg-"
        )}`}
      />
      <div className="flex items-start justify-between mb-3 relative z-10">
        <div
          className={`w-10 h-10 rounded-[16px] bg-white/10 flex items-center justify-center ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        {alert && (
          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
        )}
      </div>
      <div className="relative z-10">
        <p className="text-3xl font-black text-white tracking-tight">
          {value.toLocaleString("fa-IR")}
        </p>
        <p className="text-[11px] font-bold text-slate-300 mt-0.5">{label}</p>
      </div>
    </div>
  )
);

export const SPRING_TRANSITION = { type: "spring", stiffness: 300, damping: 25 };
export const FALLBACK_PRODUCT =
  "https://placehold.co/300x300/1f2937/a1a1aa?text=No+Image";