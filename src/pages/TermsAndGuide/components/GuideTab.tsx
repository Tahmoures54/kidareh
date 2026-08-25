import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X } from "lucide-react";
import { GUIDES } from "../constants";

const GuideTab = () => {
  const [query, setQuery] = useState("");

  const filteredGuides = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return GUIDES;
    return GUIDES.filter(g => `${g.title} ${g.desc} ${g.kw.join(" ")}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3 }} className="space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="جستجوی سوال یا کلمه کلیدی..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl pl-12 pr-12 py-3.5 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
        />
        <AnimatePresence>
          {query && (
            <motion.button initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} onClick={() => setQuery("")} className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-90 transition-transform">
              <X className="w-4 h-4 text-gray-500" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Results */}
      {filteredGuides.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 bg-white dark:bg-gray-900 rounded-[2rem] border border-dashed border-gray-200 dark:border-gray-800">
          <Search className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-black text-gray-500 dark:text-gray-400">سوالی با این کلمات پیدا نشد</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filteredGuides.map((g, i) => {
              const Icon = g.icon;
              return (
                <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.03 }} key={g.title} className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-[14px] flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-500/20">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-gray-900 dark:text-white mt-2 leading-tight tracking-tight">{g.title}</h3>
                  </div>
                  <p className="text-[13px] text-gray-600 dark:text-gray-400 leading-relaxed font-medium mb-4 pl-2">{g.desc}</p>
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-50 dark:border-gray-800/50">
                    {g.kw.map(k => (
                      <span key={k} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-2.5 py-1 rounded-lg">
                        #{k}
                      </span>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default GuideTab;