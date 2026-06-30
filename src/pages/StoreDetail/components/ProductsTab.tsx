import React, { memo } from "react";
import { Eye, Package } from "lucide-react";
import { Product } from "../types";
import { getBadgeStyle, formatPrice } from "../../../utils";
import { FALLBACK_PRODUCT, fa } from "../utils";

export const ProductsTab = memo(({ products, onProductClick }: { products: Product[]; onProductClick: (id: number) => void }) => {
  if (products.length === 0) return (
    <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-700">
      <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
      <p className="text-sm font-bold text-slate-400 dark:text-slate-500">فروشگاه هنوز کالایی ثبت نکرده است</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3 pb-6">
      {products.map(p => (
        <button key={p.id} onClick={() => onProductClick(p.id)} className="bg-white dark:bg-slate-800 rounded-[28px] overflow-hidden border border-slate-100 dark:border-slate-700/50 text-right active:scale-[0.98] transition-transform group shadow-sm flex flex-col w-full h-full">
          <div className="relative aspect-[4/5] bg-slate-100 dark:bg-slate-900 overflow-hidden w-full shrink-0">
            <img src={p.image_url || FALLBACK_PRODUCT} alt={p.name} loading="lazy" onError={e => ((e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT)} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            {p.badge && <span className={`absolute top-2 right-2 text-[9px] font-black px-2 py-0.5 rounded-lg shadow-sm backdrop-blur-md border border-white/20 ${getBadgeStyle(p.badge)}`}>{p.badge}</span>}
          </div>
          <div className="p-3.5 flex flex-col flex-1">
            <h4 className="text-[13px] font-bold text-slate-900 dark:text-white line-clamp-2 leading-tight mb-auto min-h-[36px]">{p.name}</h4>
            <div className="mt-3 space-y-2">
              <span className={`inline-block text-[9px] font-black px-2 py-0.5 rounded-lg ${p.status === "موجود" ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-slate-100 dark:bg-slate-700 text-slate-500"}`}>{p.status || "نامشخص"}</span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">{p.price ? formatPrice(p.price) : "توافقی"}</span>
                <div className="flex items-center gap-0.5 text-[9px] text-slate-400 dark:text-slate-500 font-bold"><Eye className="w-3 h-3" /> {fa(p.views || 0)}</div>
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});