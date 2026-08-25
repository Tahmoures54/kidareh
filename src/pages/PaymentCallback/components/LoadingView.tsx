import React from "react";
import { motion } from "motion/react";
import { ShieldCheck } from "lucide-react";

const LoadingView = () => (
  <motion.div
    key="loading" 
    initial={{ opacity: 0, scale: 0.95 }} 
    animate={{ opacity: 1, scale: 1 }} 
    exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }} 
    transition={{ type: "spring", stiffness: 300, damping: 25 }}
    className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 border border-gray-100 dark:border-gray-800 w-full max-w-sm text-center relative overflow-hidden"
    dir="rtl"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent pointer-events-none" />
    
    <div className="relative w-24 h-24 mx-auto mb-8">
      <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-500/20 rounded-full animate-ping opacity-60" style={{ animationDuration: '2s' }} />
      <div className="relative w-full h-full bg-indigo-50 dark:bg-gray-800 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-900 shadow-sm">
        <ShieldCheck className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
      </div>
      <div className="absolute inset-[-4px] border-4 border-transparent border-t-indigo-500 rounded-full animate-spin" style={{ animationDuration: '1.5s' }} />
    </div>

    <h2 className="text-xl font-black text-gray-900 dark:text-white mb-2 tracking-tight">در حال استعلام پرداخت</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-8 leading-relaxed">
      در حال برقراری ارتباط امن با شبکه شاپرک...<br/>لطفاً این صفحه را نبندید.
    </p>

    <div className="flex justify-center gap-2">
      {[0, 1, 2].map(i => (
        <motion.div 
          key={i} 
          animate={{ y: [0, -8, 0], opacity: [0.3, 1, 0.3] }} 
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} 
          className="w-2.5 h-2.5 bg-indigo-500 rounded-full" 
        />
      ))}
    </div>
  </motion.div>
);

export default LoadingView;