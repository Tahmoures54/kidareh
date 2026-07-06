import React, { memo } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Clock, TrendingUp, X } from "lucide-react";
import { SUGGESTED_TERMS } from "./constants";

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface IdleSectionProps {
  recents: string[];
  onRecentClick: (term: string) => void;
  onClearRecents: () => void;
  onSuggestionClick: (term: string) => void;
  onRemoveRecent?: (term: string) => void;
}

export const IdleSection = memo(({
  recents,
  onRecentClick,
  onClearRecents,
  onSuggestionClick,
  onRemoveRecent,
}: IdleSectionProps) => (
  <motion.div
    className="space-y-8 py-4"
    variants={containerVariants}
    initial="hidden"
    animate="show"
  >
    {/* Hero */}
    <motion.div variants={itemVariants} className="flex flex-col items-center text-center pt-4">
      <div className="w-20 h-20 bg-gradient-to-tr from-rose-50 to-rose-100 dark:from-rose-900/30 dark:to-rose-800/20 rounded-3xl flex items-center justify-center mb-4 shadow-lg shadow-rose-500/10">
        <SearchIcon className="w-10 h-10 text-rose-500" />
      </div>
      <h2 className="text-xl font-black mb-2 text-gray-900 dark:text-white">
        دنبال چی می‌گردی؟
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        نام کالا، برند یا فروشگاه مورد نظرت را بنویس
      </p>
    </motion.div>

    {/* Recent Searches */}
    {recents.length > 0 && (
      <motion.section variants={itemVariants}>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-sm flex items-center gap-2 text-gray-800 dark:text-gray-200">
            <Clock className="w-4 h-4 text-gray-400" />
            جستجوهای اخیر
          </h3>
          <button
            onClick={onClearRecents}
            className="text-rose-500 text-xs font-bold bg-rose-50 dark:bg-rose-500/10 px-3 py-1.5 rounded-full active:scale-95 transition-transform hover:bg-rose-100 dark:hover:bg-rose-500/20"
          >
            پاک کردن همه
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {recents.map((term, i) => (
            <div
              key={`${term}-${i}`}
              className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm overflow-hidden"
            >
              <button
                onClick={() => onRecentClick(term)}
                className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 active:scale-95 transition-transform"
              >
                {term}
              </button>
              {onRemoveRecent && (
                <button
                  onClick={() => onRemoveRecent(term)}
                  className="pl-2 pr-3 py-2 text-gray-400 hover:text-rose-500 transition-colors"
                  aria-label={`حذف ${term}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      </motion.section>
    )}

    {/* Trending */}
    <motion.section variants={itemVariants}>
      <h3 className="font-black text-sm flex items-center gap-2 mb-3 text-gray-800 dark:text-gray-200">
        <TrendingUp className="w-4 h-4 text-rose-500" />
        پرجستجوترین‌ها
      </h3>
      <div className="grid grid-cols-2 gap-2.5">
        {SUGGESTED_TERMS.map((term, i) => (
          <motion.button
            key={term}
            variants={itemVariants}
            onClick={() => onSuggestionClick(term)}
            className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-3.5 text-right group shadow-sm hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all active:scale-95"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="font-bold text-sm text-gray-800 dark:text-gray-200 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                {term}
              </p>
              <span className="text-[10px] text-gray-400 font-medium">
                #{(i + 1).toLocaleString("fa-IR")}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">جستجوی سریع</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  </motion.div>
));

IdleSection.displayName = "IdleSection";
