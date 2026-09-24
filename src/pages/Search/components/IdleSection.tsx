import React, { memo } from "react";
import { motion } from "framer-motion";
import { Search as SearchIcon, Clock, TrendingUp, X, MapPin } from "lucide-react";
import { SUGGESTED_TERMS } from "./constants";
import { categoriesData } from "../../../data/processed/categories";

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const itemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.3 } } };

interface IdleSectionProps {
  recents: string[];
  onRecentClick: (term: string) => void;
  onClearRecents: () => void;
  onSuggestionClick: (term: string) => void;
  onCategoryClick?: (category: string) => void;
  onRemoveRecent?: (term: string) => void;
}

export const IdleSection = memo(({ recents, onRecentClick, onClearRecents, onSuggestionClick, onCategoryClick, onRemoveRecent }: IdleSectionProps) => (
  <motion.div className="space-y-7 py-3" variants={containerVariants} initial="hidden" animate="show">
    <motion.div variants={itemVariants} className="rounded-3xl bg-gradient-to-br from-rose-50 to-white p-6 text-center border border-rose-100">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
        <SearchIcon className="h-7 w-7 text-rose-500" />
      </div>
      <h2 className="text-xl font-black text-gray-900">کالایت را پیدا کن</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-bold leading-6 text-gray-500">
        اسم کالا، برند یا فروشگاه را بنویس؛ اول نتیجه را ببین، بعد اگر لازم بود حساب بساز.
      </p>
      <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-black text-gray-500 shadow-sm">
        <MapPin className="h-3.5 w-3.5 text-rose-500" /> جستجوی نزدیک‌ترین گزینه‌ها
      </div>
    </motion.div>

    {recents.length > 0 && (
      <motion.section variants={itemVariants}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-black text-gray-800"><Clock className="h-4 w-4 text-gray-400" /> جستجوهای اخیر</h3>
          <button onClick={onClearRecents} className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-500">پاک کردن همه</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {recents.map((term, i) => (
            <div key={`${term}-${i}`} className="flex items-center gap-1 overflow-hidden rounded-full border border-gray-200 bg-white shadow-sm">
              <button onClick={() => onRecentClick(term)} className="px-3 py-2 text-sm font-medium text-gray-700">{term}</button>
              {onRemoveRecent && <button onClick={() => onRemoveRecent(term)} className="px-2 text-gray-400 hover:text-rose-500" aria-label={`حذف ${term}`}><X className="h-3 w-3" /></button>}
            </div>
          ))}
        </div>
      </motion.section>
    )}

    <motion.section variants={itemVariants}>
      <h3 className="mb-3 text-sm font-black text-gray-800">دسته‌بندی‌ها</h3>
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categoriesData.map((group) => <button key={group.slug} type="button" onClick={() => onCategoryClick?.(group.slug)} className="shrink-0 rounded-full border border-gray-100 bg-white px-3 py-2 text-xs font-black shadow-sm">{group.icon} {group.short}</button>)}
      </div>
    </motion.section>

    <motion.section variants={itemVariants}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-black text-gray-800"><TrendingUp className="h-4 w-4 text-rose-500" /> پیشنهاد برای شروع</h3>
      <div className="grid grid-cols-2 gap-2.5">
        {SUGGESTED_TERMS.map((term, i) => (
          <motion.button key={term} variants={itemVariants} onClick={() => onSuggestionClick(term)} className="rounded-2xl border border-gray-100 bg-white p-3.5 text-right shadow-sm transition-all hover:border-rose-200 hover:shadow-md active:scale-95">
            <div className="mb-1 flex items-center justify-between"><p className="text-sm font-bold text-gray-800">{term}</p><span className="text-[10px] font-medium text-gray-400">#{(i + 1).toLocaleString("fa-IR")}</span></div>
            <p className="text-[11px] text-gray-400">برای جستجوی فوری لمس کن</p>
          </motion.button>
        ))}
      </div>
    </motion.section>
  </motion.div>
));

IdleSection.displayName = "IdleSection";
