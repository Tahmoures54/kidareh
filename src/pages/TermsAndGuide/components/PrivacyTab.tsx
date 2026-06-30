import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { PRIVACY_ITEMS } from "../constants";

const PrivacyTab = () => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-4">
    <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-5 shadow-sm text-center">
      <ShieldCheck className="w-10 h-10 text-indigo-500 mx-auto mb-3" />
      <h3 className="text-base font-black text-gray-900 dark:text-white mb-2">رویکرد شفاف ما به حریم خصوصی</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
        ما فقط داده‌های لازم را پردازش می‌کنیم. دسترسی‌ها در چارچوب نیاز برنامه استفاده شده و هیچ‌گاه به اشخاص ثالث فروخته نمی‌شوند.
      </p>
    </div>

    <div className="grid grid-cols-1 gap-3">
      {PRIVACY_ITEMS.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className={`rounded-[1.5rem] p-4 flex items-start gap-4 shadow-sm border ${item.bg}`}>
            <div className={`w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${item.color}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white mb-1.5">{item.title}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed font-medium">{item.text}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  </motion.div>
);

export default PrivacyTab;