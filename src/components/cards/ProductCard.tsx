import React, { useState, memo } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Store, TrendingDown, Trash2, MapPin, MoreVertical, Share2, Check } from "lucide-react";

const FALLBACK = "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";

function discount(price: number, old?: number): number {
  if (!old || old <= price) return 0;
  return Math.round(((old - price) / old) * 100);
}

export const ProductCard = memo(({ product, viewMode, onRemove, isSelected, onToggleSelect, selectionMode }: any) => {
  const pct = discount(product.price, product.oldPrice);
  const [showMenu, setShowMenu] = useState(false);
  const isList = viewMode === "list";

  return (
    <motion.div
      layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
      transition={{ layout: { type: "spring", bounce: 0.15 } }}
      className={`relative w-full rounded-3xl border-2 ${
        isSelected ? "border-[var(--brand-primary)] ring-4 ring-[var(--brand-glow)] bg-[var(--brand-primary)]/5" : "border-[var(--border-light)] bg-[var(--bg-secondary)]"
      } shadow-sm overflow-visible`}
      onClick={() => selectionMode && onToggleSelect(product.id)}
    >
      <AnimatePresence>
        {selectionMode && (
          <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0 }} className="absolute top-3 right-3 z-30">
            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-[var(--brand-primary)] border-[var(--brand-primary)]" : "bg-white/80 dark:bg-slate-800 border-[var(--border-medium)] backdrop-blur-sm"}`}>
              {isSelected && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!selectionMode && (
        <div className="absolute top-3 left-3 z-30">
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }} className="w-8 h-8 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-xl flex items-center justify-center text-[var(--text-secondary)] shadow-sm border border-white/50 dark:border-slate-700/50 active:scale-90 transition">
            <MoreVertical className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div initial={{ opacity: 0, scale: 0.9, y: -5 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: -5 }} className="absolute top-10 left-0 w-40 bg-[var(--bg-secondary)]/95 backdrop-blur-xl rounded-2xl shadow-xl border border-[var(--border-light)] overflow-hidden z-40">
                <button className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition"><Share2 className="w-4 h-4 text-[var(--text-muted)]" /> اشتراک‌گذاری</button>
                <div className="h-px w-full bg-[var(--border-light)]" />
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(product.id); setShowMenu(false); }} className="w-full flex items-center gap-2.5 px-4 py-3 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition"><Trash2 className="w-4 h-4" /> حذف از نشان‌ها</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <Link to={`/product/${product.id}`} onClick={(e) => selectionMode && e.preventDefault()} className={`flex ${isList ? "flex-row h-44" : "flex-col"} rounded-3xl overflow-hidden`}>
        <div className={`relative bg-[var(--bg-tertiary)] overflow-hidden ${isList ? "w-44 h-full shrink-0" : "aspect-square w-full"}`}>
          <img src={product.image || FALLBACK} alt={product.name} loading="lazy" onError={e => ((e.currentTarget as HTMLImageElement).src = FALLBACK)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          
          {pct > 0 && <span className="absolute bottom-2.5 right-2.5 bg-rose-500/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md border border-white/10"><TrendingDown className="w-3 h-3" /> {pct}٪ تخفیف</span>}
          <span className={`absolute top-2.5 right-2.5 text-[10px] font-black px-2.5 py-1 rounded-xl backdrop-blur-md shadow-sm border border-white/10 ${product.status === "موجود" ? "bg-emerald-500/90 text-white" : "bg-black/60 text-white"} ${selectionMode ? "opacity-0" : ""}`}>{product.status}</span>
        </div>

        <div className={`p-4 flex flex-col justify-between bg-[var(--bg-secondary)] ${isList ? "flex-1 py-3" : ""}`}>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] leading-relaxed mb-2 line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--text-muted)] mb-3">
              <span className="flex items-center gap-1 font-medium"><Store className="w-3 h-3" /> {product.store}</span>
              {product.distanceValue < 999999 && <span className="flex items-center gap-1 font-medium"><MapPin className="w-3 h-3" /> {product.distance}</span>}
            </div>
          </div>
          
          <div className="flex items-end justify-between mt-auto">
            <div className="flex-1">
              {product.oldPrice > 0 && <p className="text-[11px] text-[var(--text-muted)] line-through mb-0.5">{product.oldPrice.toLocaleString("fa-IR")}</p>}
              <p className="text-base font-black text-[var(--brand-primary)]">{product.price.toLocaleString("fa-IR")} <span className="text-[10px] font-normal mr-1 text-[var(--text-muted)]">تومان</span></p>
            </div>
            
            {!selectionMode && (
              <motion.button 
                whileTap={{ scale: 0.7 }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(product.id); }} 
                className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center transition-colors active:bg-rose-100 dark:active:bg-rose-500/20"
              >
                <Heart className="w-4 h-4 fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
              </motion.button>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

export const SavedSkeleton = memo(({ viewMode }: { viewMode: string }) => (
  <div className={`grid gap-4 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <div key={i} className={`bg-[var(--bg-secondary)] rounded-3xl overflow-hidden border border-[var(--border-light)] flex ${viewMode === "list" ? "flex-row h-44" : "flex-col"}`}>
        <div className={`${viewMode === "list" ? "w-44 h-full" : "aspect-square w-full"} bg-[var(--bg-tertiary)] shimmer`} />
        <div className="p-4 flex-1 flex flex-col justify-center space-y-3">
          <div className="h-3 bg-[var(--bg-tertiary)] shimmer rounded-full w-4/5" /><div className="h-3 bg-[var(--bg-tertiary)] shimmer rounded-full w-3/5" />
          <div className="mt-auto h-4 bg-[var(--bg-tertiary)] shimmer rounded-full w-2/5" />
        </div>
      </div>
    ))}
  </div>
));