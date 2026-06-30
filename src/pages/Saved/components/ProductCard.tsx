import React, { useState, memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Store, TrendingDown, Trash2, MapPin, MoreVertical, Share2, Check } from "lucide-react";

const FALLBACK = "https://placehold.co/400x400/1f2937/a1a1aa?text=کالا";

function discount(price: number, old?: number): number {
  if (!old || old <= price) return 0;
  return Math.round(((old - price) / old) * 100);
}

export const ProductCard = memo(({ product, viewMode, onRemove, isSelected, onToggleSelect, selectionMode }: any) => {
  const pct = discount(product.price, product.oldPrice);
  const [showMenu, setShowMenu] = useState(false);
  const isList = viewMode === "list";

  return (
    // حذف overflow-hidden از این سطح تا منو آزادانه باز شود
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ layout: { type: "spring", bounce: 0.15 } }}
      className={`relative w-full rounded-2xl border ${
        isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-500/5" : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
      } shadow-sm overflow-visible`} // overflow-visible اضافه شد
      onClick={() => selectionMode && onToggleSelect(product.id)}
    >
      {/* Select Mode Checkbox */}
      <AnimatePresence>
        {selectionMode && (
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-3 right-3 z-30">
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-indigo-600 border-indigo-600" : "bg-white/80 dark:bg-gray-800 border-gray-300 dark:border-gray-600 backdrop-blur-sm"}`}>
              {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Menu */}
      {!selectionMode && (
        <div className="absolute top-2.5 left-2.5 z-30">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }} className="w-8 h-8 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-300 shadow-sm border border-gray-100 dark:border-gray-700 active:scale-90 transition">
            <MoreVertical className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} className="absolute top-10 left-0 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl border dark:border-gray-700 overflow-hidden z-40">
                <button className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition"><Share2 className="w-4 h-4 text-gray-400" /> اشتراک‌گذاری</button>
                <div className="h-px w-full bg-gray-100 dark:bg-gray-700" />
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(product.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"><Trash2 className="w-4 h-4" /> حذف از نشان‌ها</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Link to={`/product/${product.id}`} onClick={(e) => selectionMode && e.preventDefault()} className={`flex ${isList ? "flex-row h-40" : "flex-col"} rounded-2xl overflow-hidden`}>
        {/* Image Section - overflow-hidden اینجا قرار می‌گیرد */}
        <div className={`relative bg-gray-50 dark:bg-gray-800 overflow-hidden ${isList ? "w-40 h-full shrink-0" : "aspect-square w-full"}`}>
          <img src={product.image || FALLBACK} alt={product.name} loading="lazy" onError={e => ((e.currentTarget as HTMLImageElement).src = FALLBACK)} className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-500" />
          {pct > 0 && <span className="absolute bottom-2.5 right-2.5 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1 shadow-md"><TrendingDown className="w-3 h-3" /> {pct}٪ تخفیف</span>}
          <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-1 rounded-lg backdrop-blur-sm shadow-sm ${product.status === "موجود" ? "bg-emerald-500/90 text-white" : "bg-gray-900/80 text-white"} ${selectionMode ? "opacity-0" : ""}`}>{product.status}</span>
        </div>

        {/* Content Section */}
        <div className={`p-3.5 flex flex-col justify-between ${isList ? "flex-1 py-3" : ""}`}>
          <div>
            <h3 className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-relaxed mb-2 line-clamp-2 min-h-[2rem]">{product.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mb-3">
              <span className="flex items-center gap-1 font-medium"><Store className="w-3 h-3" /> {product.store}</span>
              {product.distanceValue < 999999 && <span className="flex items-center gap-1 font-medium"><MapPin className="w-3 h-3" /> {product.distance}</span>}
            </div>
          </div>
          
          <div className="flex items-end justify-between mt-auto">
            <div className="flex-1">
              {product.oldPrice > 0 && <p className="text-[10px] text-gray-400 line-through mb-0.5">{product.oldPrice.toLocaleString("fa-IR")}</p>}
              <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">{product.price.toLocaleString("fa-IR")} <span className="text-[9px] font-normal mr-1 text-gray-400">تومان</span></p>
            </div>
            
            {!selectionMode && (
              <motion.button 
                whileTap={{ scale: 0.7 }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(product.id); }} 
                className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center transition-colors active:bg-rose-100 dark:active:bg-rose-500/20"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
              </motion.button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export const SavedSkeleton = memo(({ viewMode }: { viewMode: string }) => (
  <div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className={`bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 animate-pulse flex ${viewMode === "list" ? "flex-row h-36" : "flex-col"}`}>
        <div className={`${viewMode === "list" ? "w-36 h-full" : "aspect-square w-full"} bg-gray-200 dark:bg-gray-800`} />
        <div className="p-3 flex-1 flex flex-col justify-center space-y-3">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" /><div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full w-3/5" />
          <div className="mt-auto h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-2/5" />
        </div>
      </div>
    ))}
  </div>
));