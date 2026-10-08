import React from "react";
import { motion } from "framer-motion";

const TypingIndicator = () => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
    className="mb-4 flex justify-start"
  >
    <div className="flex items-center gap-1.5 rounded-2xl rounded-tr-sm border border-slate-100 bg-white px-4 py-3 shadow-sm">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
          className="h-1.5 w-1.5 rounded-full bg-cyan-400"
        />
      ))}
    </div>
  </motion.div>
);

export default TypingIndicator;
