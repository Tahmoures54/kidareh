import React from "react";
import { motion } from "motion/react";
import { Sparkles } from "lucide-react";

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    className="flex items-end gap-2 mb-4"
  >
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0 relative overflow-hidden">
      <div className="absolute inset-0 bg-white/20 animate-pulse" />
      <Sparkles className="w-4 h-4 text-white relative z-10" />
    </div>
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-br-sm px-4 py-3 shadow-sm flex items-center gap-1.5">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
          className="w-1.5 h-1.5 bg-violet-500 dark:bg-violet-400 rounded-full"
        />
      ))}
    </div>
  </motion.div>
);

export default TypingIndicator;