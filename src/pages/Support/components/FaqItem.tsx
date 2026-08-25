import React, { useState, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { SPRING_TRANSITION } from "../utils";

interface FaqItemProps {
  question: string;
  answer: string;
  defaultOpen?: boolean;
}

const FaqItem = memo(({ question, answer, defaultOpen = false }: FaqItemProps) => {
  const [open, setOpen] = useState(defaultOpen);
  
  return (
    <div className={`rounded-[24px] border transition-colors duration-300 overflow-hidden ${open ? "bg-indigo-50/50 dark:bg-indigo-500/5 border-indigo-100 dark:border-indigo-500/20" : "bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/50"}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-4 text-right active:scale-[0.99] transition-transform">
        <div className={`w-10 h-10 rounded-[16px] flex items-center justify-center shrink-0 transition-colors ${open ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/20" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className={`text-sm font-black leading-snug transition-colors ${open ? "text-indigo-900 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>{question}</p>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} transition={SPRING_TRANSITION} className="shrink-0">
          <ChevronDown className={`w-5 h-5 ${open ? "text-indigo-500" : "text-slate-400"}`} />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={SPRING_TRANSITION} className="overflow-hidden">
            <div className="px-5 pb-5 pr-[4.5rem]">
              <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default FaqItem;