import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Eye, Edit, Share2, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { formatPrice, getBadgeStyle } from "../../../utils";
import { Product } from "../types";
import { FALLBACK_IMAGE, STATUS_STYLE } from "./constants";

interface ProductItemProps {
  product: Product;
  isUpdating: boolean;
  isDeleting: boolean;
  onStatusChange: (p: Product) => void;
  onTogglePublic: (p: Product) => void;
  onDelete: (id: number) => void;
  onShare: (p: Product) => void;
}

export const ProductItem = React.memo(({ product, isUpdating, isDeleting, onStatusChange, onTogglePublic, onDelete, onShare }: ProductItemProps) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex gap-4 p-3 relative">
      
      <div className="relative w-24 h-24 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0 overflow-hidden">
        <img src={product.image || FALLBACK_IMAGE} alt={product.name} onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)} className="w-full h-full object-cover" />
        {product.badge && <span className={`absolute bottom-0 inset-x-0 text-[9px] font-black py-0.5 text-center text-white ${getBadgeStyle(product.badge)}`}>{product.badge}</span>}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div>
          <h4 className="text-sm font-bold line-clamp-1 text-slate-900 dark:text-white">{product.name}</h4>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-sm font-black text-slate-900 dark:text-white">{formatPrice(product.price)} <span className="text-[10px] font-normal text-slate-400">تومان</span></span>
            <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded-md"><Eye className="w-3 h-3" />{product.views.toLocaleString("fa-IR")}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => onStatusChange(product)} disabled={isUpdating} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all disabled:opacity-50 ${STATUS_STYLE[product.status]}`}>
            {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : product.status}
          </button>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${product.isPublic ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "text-slate-400 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"}`}>
            {product.isPublic ? "منتشر" : "پیش‌نویس"}
          </span>
        </div>
      </div>

      <div className="absolute top-3 left-3 z-10">
        <button onClick={() => setShowMenu(!showMenu)} className="w-8 h-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-sm border border-slate-100 dark:border-slate-700">
          <MoreHorizontal className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        </button>
        
        <AnimatePresence>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="absolute left-0 top-10 z-20 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <Link to={`/add-product?edit=${product.id}`} onClick={() => setShowMenu(false)} className="flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"><Edit className="w-4 h-4"/> ویرایش</Link>
                <button onClick={() => { onShare(product); setShowMenu(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"><Share2 className="w-4 h-4"/> اشتراک‌گذاری</button>
                <button onClick={() => { onDelete(product.id); setShowMenu(false); }} className={`w-full flex items-center gap-2 px-4 py-3 text-xs font-bold border-t border-slate-100 dark:border-slate-700 ${isDeleting ? 'bg-rose-500 text-white' : 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10'}`}>
                  {isDeleting ? <><AlertTriangle className="w-4 h-4"/> مطمئنید؟</> : <><Trash2 className="w-4 h-4"/> حذف</>}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});