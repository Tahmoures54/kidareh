import React from "react";
import { motion } from "framer-motion";

interface Props {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}

const SegmentedControl = React.memo(({ options, value, onChange }: Props) => (
  <div className="relative flex bg-[var(--bg-tertiary)] p-1 rounded-[18px] h-[52px] items-center w-full border border-[var(--border-light)]/50 shadow-inner">
    {options.map((opt) => {
      const isActive = value === opt;
      const isAvailable = opt === "موجود";

      return (
        <button
          key={opt}
          type="button"
          onClick={() => {
            onChange(opt);
            if (navigator.vibrate) navigator.vibrate(30); // ویبره نرم‌تر و پریمیوم‌تر
          }}
          className={`flex-1 relative z-10 py-2 rounded-2xl text-sm font-black transition-colors duration-300 ${
            isActive
              ? isAvailable
                ? "text-[var(--brand-primary)]"
                : "text-rose-500"
              : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
          }`}
        >
          {opt}
          
          {isActive && (
            <motion.div
              layoutId="status-pill"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className={`absolute inset-0 -z-10 rounded-2xl shadow-sm border ${
                isAvailable
                  ? "bg-[var(--bg-secondary)] border-[var(--brand-primary)]/30"
                  : "bg-[var(--bg-secondary)] border-rose-500/30"
              }`}
            />
          )}
        </button>
      );
    })}
  </div>
));

export default SegmentedControl;