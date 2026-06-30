import React, { memo, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Check, Store, Star, MapPin, Navigation, Share2, SlidersHorizontal, X,
  RotateCcw, Search as SearchIcon, Clock, TrendingUp, Globe, Building, Map
} from "lucide-react";

import { getBadgeStyle, formatPrice } from "../../utils";
import { ProductResult, SearchFilters, LocationScopeType } from "./types";

export const FALLBACK = "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";
export const SPRING_TRANSITION = { type: "spring", stiffness: 300, damping: 25 };
export const SUGGESTED_TERMS = ["آیفون", "لپ‌تاپ", "دوچرخه", "یخچال", "مبل", "کفش"];

export const Toast = memo(({ msg }: { msg: string }) => (
  <motion.div initial={{ opacity: 0, y: -24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 pointer-events-none">
    <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> {msg}
  </motion.div>
));

export const SearchSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-4 animate-pulse">
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-[22px] bg-slate-200 dark:bg-slate-700 flex-shrink-0 relative overflow-hidden">
             <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          </div>
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5" />
            <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full w-2/3" />
            <div className="flex justify-between pt-4"><div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-24" /><div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-16" /></div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

export const ProductCard = memo(({ product, index, onShare, onNavigate }: { product: ProductResult, index: number, onShare: any, onNavigate: any }) => (
  <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.015, 0.12) }} className="mb-4 bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 overflow-hidden shadow-sm hover:shadow-lg active:scale-[0.985] transition-all duration-300">
    <Link to={`/product/${product.id}`} className="flex gap-4 p-4">
      <div className="relative w-28 h-28 flex-shrink-0 rounded-[22px] overflow-hidden bg-slate-100 dark:bg-slate-700">
        <img src={product.image_url || FALLBACK} alt={product.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK; }} className="w-full h-full object-cover" />
        {product.badge && <span className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/20 shadow-sm ${getBadgeStyle(product.badge)}`}>{product.badge}</span>}
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[15px] leading-tight line-clamp-2 text-slate-900 dark:text-white mb-2">{product.name}</h3>
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2 flex-wrap">
            <span className="flex items-center gap-1 truncate"><Store className="w-3.5 h-3.5 flex-shrink-0" /> {product.store_name || "نامشخص"}</span>
            <span className="flex items-center gap-1 text-amber-500 flex-shrink-0"><Star className="w-3.5 h-3.5 fill-current" /> {product.rating.toFixed(1)}</span>
          </div>
        </div>
        <div className="flex justify-between items-end gap-3">
          <div className="min-w-0">
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3" /> {product.distance}</p>
            <p className="font-black text-lg text-slate-900 dark:text-white tracking-tight truncate">{product.price ? formatPrice(product.price) : "توافقی"}</p>
          </div>
          <div className="text-left shrink-0">
            <span className={`inline-block px-2.5 py-1 text-[10px] font-black rounded-lg mb-1 ${product.status === "موجود" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400"}`}>{product.status || "نامشخص"}</span>
          </div>
        </div>
      </div>
    </Link>
    <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-700/50 text-sm">
      <button onClick={() => onNavigate(product)} className="py-3.5 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 active:bg-indigo-100 transition-colors font-bold"><Navigation className="w-4 h-4" /> مسیریابی</button>
      <button onClick={() => onShare(product)} className="py-3.5 flex items-center justify-center gap-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 active:bg-slate-100 transition-colors font-bold border-r border-slate-100 dark:border-slate-700/50"><Share2 className="w-4 h-4" /> اشتراک‌گذاری</button>
    </div>
  </motion.div>
));

// فیلتر شیت توسعه یافته با بخش محدوده جستجو
export const FilterSheet = memo(({ open, filters, onChange, onClose, onReset }: any) => {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [open]);

  const scopeOptions: { value: LocationScopeType; label: string; icon: React.ReactNode }[] = [
    { value: "city", label: `شهر ${filters.scope.name || ''}`, icon: <Building className="w-4 h-4" /> },
    { value: "province", label: "کل استان", icon: <Map className="w-4 h-4" /> },
    { value: "country", label: "سراسری", icon: <Globe className="w-4 h-4" /> },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm z-[80]" />
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={SPRING_TRANSITION} className="fixed bottom-0 inset-x-0 z-[90] bg-white dark:bg-slate-900 rounded-t-[32px] shadow-2xl border-t max-h-[85vh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b px-5 pt-3 pb-4 z-10">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between">
                <h3 className="font-black text-lg flex items-center gap-2"><SlidersHorizontal className="w-5 h-5 text-indigo-500" /> فیلترها</h3>
                <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-5 space-y-6">
              
              {/* بخش جدید: محدوده جستجو */}
              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">محدوده جستجو</label>
                <div className="flex gap-2 flex-wrap">
                  {scopeOptions.map(s => (
                    <button key={s.value} onClick={() => onChange({ scope: { ...filters.scope, type: s.value } })} className={`px-4 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 ${filters.scope.type === s.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30" : "bg-slate-100 dark:bg-slate-800"}`}>
                      {s.icon} {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">ترتیب نمایش</label>
                <div className="flex gap-2 flex-wrap">
                  {[{ value: "newest", label: "جدیدترین" }, { value: "nearest", label: "نزدیک‌ترین" }, { value: "cheapest", label: "ارزان‌ترین" }].map(s => (
                    <button key={s.value} onClick={() => onChange({ sortBy: s.value })} className={`px-4 py-2.5 rounded-full text-sm font-bold ${filters.sortBy === s.value ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30" : "bg-slate-100 dark:bg-slate-800"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-3 block">محدوده قیمت (تومان)</label>
                <div className="flex gap-3">
                  <input type="number" placeholder="از" value={filters.minPrice} onChange={e => onChange({ minPrice: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors" />
                  <span className="text-slate-400 pt-3">تا</span>
                  <input type="number" placeholder="تا" value={filters.maxPrice} onChange={e => onChange({ maxPrice: e.target.value })} className="flex-1 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>
              <div className="flex justify-between items-center py-3 px-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                <span className="font-bold text-sm">فقط کالاهای موجود</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={filters.onlyAvailable} onChange={e => onChange({ onlyAvailable: e.target.checked })} className="sr-only peer" />
                  <div className="w-12 h-7 bg-slate-200 rounded-full peer peer-checked:bg-indigo-500 transition-colors after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 peer-checked:after:-translate-x-5" />
                </label>
              </div>
              <div className="grid grid-cols-[1fr_2fr] gap-3 pt-4">
                <button onClick={onReset} className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> بازنشانی</button>
                <button onClick={onClose} className="h-14 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black shadow-lg shadow-indigo-500/30">نمایش نتایج</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export const IdleSection = memo(({ recents, onRecentClick, onClearRecents, onSuggestionClick }: any) => (
  <div className="space-y-10 py-6">
    <div className="flex flex-col items-center text-center mb-8">
      <div className="w-20 h-20 bg-gradient-to-tr from-indigo-50 to-violet-100 dark:from-indigo-900/30 dark:to-violet-800/30 rounded-[30px] flex items-center justify-center mb-5 rotate-12 shadow-lg shadow-indigo-500/10"><SearchIcon className="w-10 h-10 text-indigo-500 -rotate-12" /></div>
      <h2 className="text-xl font-black mb-2">دنبال چی می‌گردی؟</h2>
      <p className="text-sm text-slate-500 max-w-xs">نام کالا یا فروشگاه مورد نظر خود را جستجو کنید.</p>
    </div>
    {recents.length > 0 && (
      <section>
        <div className="flex justify-between mb-4">
          <h3 className="font-black text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-slate-400" /> جستجوهای اخیر</h3>
          <button onClick={onClearRecents} className="text-rose-500 text-xs font-bold bg-rose-50 px-3 py-1.5 rounded-full">پاک کردن</button>
        </div>
        <div className="flex flex-wrap gap-2">
          {recents.map((term: string, i: number) => <button key={`${term}-${i}`} onClick={() => onRecentClick(term)} className="bg-white dark:bg-slate-800 border dark:border-slate-700 px-4 py-2.5 rounded-full text-sm font-medium shadow-sm">{term}</button>)}
        </div>
      </section>
    )}
    <section>
      <h3 className="font-black text-sm flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-indigo-500" /> محبوب‌ترین‌ها</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SUGGESTED_TERMS.map(term => (
          <button key={term} onClick={() => onSuggestionClick(term)} className="bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-4 text-right group shadow-sm hover:shadow-md transition-shadow">
            <p className="font-bold group-hover:text-indigo-500 transition-colors">{term}</p>
            <p className="text-[10px] text-slate-400 mt-1">جستجوی سریع</p>
          </button>
        ))}
      </div>
    </section>
  </div>
));