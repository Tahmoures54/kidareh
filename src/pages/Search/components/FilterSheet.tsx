import React, { memo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { SlidersHorizontal, X, RotateCcw, Building, Map, Globe } from "lucide-react";
import { LocationScopeType, SearchFilters } from "../types";
import { SPRING_TRANSITION } from "./constants";

interface FilterSheetProps {
  open: boolean;
  filters: SearchFilters;
  onChange: (f: Partial<SearchFilters>) => void;
  onClose: () => void;
  onReset: () => void;
}

export const FilterSheet = memo(({ open, filters, onChange, onClose, onReset }: FilterSheetProps) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  const scopeOptions: { value: LocationScopeType; label: string; icon: React.ReactNode }[] = [
    { value: "city", label: `شهر ${filters.scope.name || ""}`, icon: <Building className="w-4 h-4" /> },
    { value: "province", label: "کل استان", icon: <Map className="w-4 h-4" /> },
    { value: "country", label: "سراسری", icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[80]" dir="rtl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING_TRANSITION}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
            className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t border-slate-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <div className="pt-3 flex justify-center sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
            </div>

            <div className="sticky top-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-5 pt-3 pb-4 z-10">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-indigo-500" /> فیلترها
                </h3>
                <button
                  onClick={onClose}
                  aria-label="بستن"
                  className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-transform"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-6">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">محدوده جستجو</label>
                <div className="flex gap-2 flex-wrap">
                  {scopeOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => onChange({ scope: { ...filters.scope, type: s.value } })}
                      className={`px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all active:scale-95 ${
                        filters.scope.type === s.value
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">ترتیب نمایش</label>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { value: "newest", label: "جدیدترین" },
                    { value: "nearest", label: "نزدیک‌ترین" },
                    { value: "cheapest", label: "ارزان‌ترین" },
                  ].map((s) => (
                    <button
                      key={s.value}
                      onClick={() => onChange({ sortBy: s.value as SearchFilters["sortBy"] })}
                      className={`px-4 py-2.5 rounded-full text-sm font-bold transition-all active:scale-95 ${
                        filters.sortBy === s.value
                          ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                          : "bg-slate-100 dark:bg-slate-800"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">محدوده قیمت (تومان)</label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    placeholder="از"
                    value={filters.minPrice}
                    onChange={(e) => onChange({ minPrice: e.target.value })}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors w-full"
                  />
                  <span className="text-slate-400 text-sm">تا</span>
                  <input
                    type="number"
                    placeholder="تا"
                    value={filters.maxPrice}
                    onChange={(e) => onChange({ maxPrice: e.target.value })}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors w-full"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="font-bold text-sm">فقط کالاهای موجود</span>
                <button
                  onClick={() => onChange({ onlyAvailable: !filters.onlyAvailable })}
                  className={`relative w-12 h-7 rounded-full transition-colors ${filters.onlyAvailable ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`}
                  aria-pressed={filters.onlyAvailable}
                  aria-label="فقط کالاهای موجود"
                >
                  <motion.div
                    layout
                    transition={SPRING_TRANSITION}
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md ${filters.onlyAvailable ? "right-1" : "right-6"}`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-[1fr_2fr] gap-3 pt-4">
                <button
                  onClick={onReset}
                  className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform"
                >
                  <RotateCcw className="w-4 h-4" /> بازنشانی
                </button>
                <button
                  onClick={onClose}
                  className="h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-lg shadow-indigo-500/30 active:scale-95 transition-transform"
                >
                  نمایش نتایج
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
});