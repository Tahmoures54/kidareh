import React, { memo } from "react";
import { motion } from "motion/react";
import { Search as SearchIcon, Clock, TrendingUp } from "lucide-react";
import { SUGGESTED_TERMS } from "./constants";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 }
};

export const IdleSection = memo(({ recents, onRecentClick, onClearRecents, onSuggestionClick }: any) => (
  <motion.div 
    className="space-y-10 py-6"
    variants={containerVariants}
    initial="hidden"
    animate="show"
  >
    <motion.div variants={itemVariants} className="flex flex-col items-center text-center mb-8">
      <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-800/30 rounded-[30px] flex items-center justify-center mb-5 rotate-12 shadow-lg shadow-indigo-500/10">
        <SearchIcon className="w-10 h-10 text-indigo-500 -rotate-12" />
      </div>
      <h2 className="text-xl font-black mb-2">دنبال چی می‌گردی؟</h2>
      <p className="text-sm text-slate-500 max-w-xs">
        نام کالا یا فروشگاه مورد نظر خود را جستجو کنی.
      </p>
    </motion.div>

    {recents.length > 0 && (
      <motion.section variants={itemVariants}>
        <div className="flex justify-between mb-4">
          <h3 className="font-black text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> جستجوهای اخیر
          </h3>
          <button
            onClick={onClearRecents}
            className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
          >
            پاک کردن
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {recents.map((term: string, i: number) => (
            <button
              key={`${term}-${i}`}
              onClick={() => onRecentClick(term)}
              className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm active:scale-95 transition-transform"
            >
              {term}
            </button>
          ))}
        </div>
      </motion.section>
    )}

    <section>
      <h3 className="font-black text-sm flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-indigo-500" /> محبوب‌ترین‌ها
      </h3>
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
        variants={containerVariants}
      >
        {SUGGESTED_TERMS.map((term) => (
          <motion.button
            key={term}
            variants={itemVariants}
            onClick={() => onSuggestionClick(term)}
            className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 text-right group shadow-sm hover:shadow-md transition-shadow active:scale-95"
          >
            <p className="font-bold group-hover:text-indigo-500 transition-colors">{term}</p>
            <p className="text-[10px] text-slate-400 mt-1">جستجوی سریع</p>
          </motion.button>
        ))}
      </motion.div>
    </section>
  </motion.div>
));