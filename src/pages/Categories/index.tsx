import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Search, X, LayoutGrid, Package, Sparkles, Layers } from "lucide-react";

import { categoriesData } from "@data/processed/categories";
import { CategoryGroup } from "./types";
import GroupCard from "./components/GroupCard";

export default function Categories() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const filtered = useMemo<CategoryGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categoriesData as CategoryGroup[];

    return (categoriesData as CategoryGroup[])
      .map((g) => ({
        ...g,
        types: g.types.filter(
          (t) => t.text.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.types.length > 0 || g.group.toLowerCase().includes(q));
  }, [query]);

  const totalTypes = useMemo(() => filtered.reduce((s, g) => s + g.types.length, 0), [filtered]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950 pb-28 text-gray-900 dark:text-white" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-2xl border-b border-gray-200/60 dark:border-gray-800/60 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4 shadow-sm shadow-gray-900/5">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full flex items-center justify-center active:scale-90 transition-transform shadow-sm"
            aria-label="برگشت"
          >
            <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>

          <div className="flex-1">
            <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              دسته‌بندی‌ها
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">چی می‌خوای؟ از اینجا پیدا کن</p>
          </div>
        </div>

        <div className="relative group">
          <div className="absolute inset-y-0 right-0 flex items-center pointer-events-none pr-4">
            <Search className="w-5 h-5 text-gray-400 group-focus-within:text-teal-600 dark:group-focus-within:text-teal-400 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="جستجوی دسته… مثلاً موبایل"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-gray-100 dark:bg-gray-900 border border-transparent rounded-2xl pl-12 pr-11 py-3.5 text-sm font-bold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:border-teal-500/50 dark:focus:border-teal-400/50 focus:ring-4 focus:ring-teal-500/10 transition-all outline-none"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                onClick={() => setQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center active:scale-90 transition-transform"
                aria-label="پاک کردن"
              >
                <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="px-4 py-5">
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-20"
            >
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div
                  className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/20 rounded-full animate-ping"
                  style={{ animationDuration: "3s" }}
                />
                <div className="relative w-full h-full bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-[2rem] flex items-center justify-center shadow-xl rotate-3">
                  <Search className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                </div>
              </div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white mb-2">چیزی پیدا نشد</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">یه کلمه دیگه امتحان کن</p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="mt-6 px-6 py-2.5 bg-teal-600 text-white rounded-xl font-bold text-sm shadow-md active:scale-95 transition-transform"
              >
                پاک کردن جستجو
              </button>
            </motion.div>
          ) : (
            <motion.div key="list" layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
              <AnimatePresence>
                {!query && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    className="grid grid-cols-3 gap-3 overflow-hidden"
                  >
                    {[
                      {
                        label: "گروه",
                        value: filtered.length,
                        icon: LayoutGrid,
                        bg: "bg-teal-50 dark:bg-teal-500/10",
                        color: "text-teal-600 dark:text-teal-400",
                      },
                      {
                        label: "زیردسته",
                        value: totalTypes,
                        icon: Package,
                        bg: "bg-cyan-50 dark:bg-cyan-500/10",
                        color: "text-cyan-600 dark:text-cyan-400",
                      },
                      {
                        label: "کالا",
                        value: "زیاد",
                        icon: Sparkles,
                        bg: "bg-amber-50 dark:bg-amber-500/10",
                        color: "text-amber-600 dark:text-amber-400",
                      },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className={`${s.bg} rounded-3xl p-4 flex flex-col items-center justify-center gap-2 border border-white/50 dark:border-gray-800`}
                      >
                        <s.icon className={`w-6 h-6 ${s.color}`} />
                        <div className="text-center">
                          <span className={`block text-lg font-black ${s.color} leading-none mb-1`}>{s.value}</span>
                          <span className="block text-[10px] text-gray-500 dark:text-gray-400 font-bold">{s.label}</span>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout className="space-y-3">
                {filtered.map((g, i) => (
                  <GroupCard key={g.group} group={g} index={i} isSearchActive={query.length > 0} />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
