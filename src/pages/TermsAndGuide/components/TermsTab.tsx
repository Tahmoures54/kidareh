import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { TERMS_SECTIONS } from "../constants";

const TermsTab = () => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-4">
    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-[1.5rem] p-4 flex items-start gap-3 shadow-sm">
      <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center flex-shrink-0 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <div>
        <p className="text-sm font-black text-rose-800 dark:text-rose-300 mb-1">سلب مسئولیت پلتفرم</p>
        <p className="text-xs text-rose-700/80 dark:text-rose-300/80 leading-relaxed font-medium">
          کی‌داره صرفاً بستر معرفی کالا و تسهیل ارتباط است. مسئولیت بررسی اصالت، کیفیت کالا و هرگونه معامله مالی مستقیماً بر عهده فروشنده و خریدار است.
        </p>
      </div>
    </div>

    {TERMS_SECTIONS.map((section, i) => {
      const Icon = section.icon;
      return (
        <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${section.gradient} ${section.darkGradient} shadow-inner`}>
              <Icon className="w-5 h-5 text-white drop-shadow-sm" />
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white tracking-tight">{section.title}</h3>
          </div>
          <ul className="space-y-3">
            {section.items.map((item, j) => (
              <li key={j} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 mt-2 flex-shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      );
    })}
  </motion.div>
);

export default TermsTab;