import React from "react";
import { motion } from "motion/react"; // یکپارچه شدن فریمورک

interface Props {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

const SegmentedControl = React.memo(({ options, value, onChange }: Props) => {
  // فرض می‌کنیم گزینه اول همیشه حالت مثبت است (مثل: موجود)
  const isPositiveState = value === options[0];

  return (
    <div className="relative flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl h-full w-full">
      {options.map((opt) => {
        const isActive = value === opt;
        const isPositive = opt === options[0];

        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              onChange(opt);
              if (navigator.vibrate) navigator.vibrate(20);
            }}
            className={`flex-1 relative z-10 rounded-lg text-sm font-bold transition-colors duration-200 ${
              isActive
                ? isPositive
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-rose-500"
                : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            {opt}
            
            {isActive && (
              <motion.div
                layoutId="status-pill"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className={`absolute inset-0 -z-10 rounded-lg shadow-sm border ${
                  isPositive
                    ? "bg-white dark:bg-slate-700 border-indigo-200 dark:border-indigo-500/30"
                    : "bg-white dark:bg-slate-700 border-rose-200 dark:border-rose-500/30"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
});

export default SegmentedControl;