import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SlidersHorizontal, Check } from "lucide-react";
import { SortKey, SORT_OPTIONS } from "../types";

export function SortSheet({ open, value, onClose, onChange }: { open: boolean; value: SortKey; onClose: () => void; onChange: (v: SortKey) => void; }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-2xl mx-auto rounded-t-[2.5rem] bg-white dark:bg-gray-900 border-t border-gray-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] pb-[max(1.5rem,env(safe-area-inset-bottom))] px-5" dir="rtl"
          >
            <div className="flex justify-center pt-4 pb-3"><div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700" /></div>
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-indigo-500" /> مرتب‌سازی فروشگاه‌ها</h3>
            <div className="space-y-2">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.id} onClick={() => { onChange(opt.id); onClose(); }}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl text-sm font-bold transition-all ${value === opt.id ? "bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm" : "bg-gray-50 text-gray-700 border border-transparent hover:bg-gray-100"}`}
                >
                  {opt.label} {value === opt.id && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}