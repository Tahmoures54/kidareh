import React, { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Store, AlertCircle } from "lucide-react";

export const MiniHeader = memo(({ onBack, showBack }: { onBack: () => void; showBack: boolean }) => (
  <div className="absolute top-0 inset-x-0 p-5 flex items-center justify-between z-30">
    {showBack ? (
      <motion.button 
        whileTap={{ scale: 0.9 }} onClick={onBack}
        className="w-10 h-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:border-cyan-400 transition-colors"
      >
        <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
      </motion.button>
    ) : <div />}
    
    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/50 dark:border-slate-700/20">
      <div className="w-6 h-6 bg-gradient-to-br from-cyan-400 to-violet-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
        <Store className="w-3.5 h-3.5 text-white" />
      </div>
      <span className="text-xs font-black text-slate-800 dark:text-slate-200">کی داره؟</span>
    </div>
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
        className="flex items-center gap-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-3.5 shadow-sm"
      >
        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}>
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
        </motion.div>
        <p className="flex-1 font-bold text-rose-900 dark:text-rose-300 text-xs">{error}</p>
      </motion.div>
    )}
  </AnimatePresence>
));