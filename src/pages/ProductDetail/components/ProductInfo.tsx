import React, { memo } from "react";
import { Clock, Star, ShieldAlert } from "lucide-react";
import { ProductData } from "../types";
import { getBadgeStyle, formatPrice } from "../../../utils";

interface Props {
  product: ProductData;
  isAvailable: boolean;
  avgRating: string;
}

export const ProductInfo = memo(({ product, isAvailable, avgRating }: Props) => {
  return (
    <>
      <div className="space-y-4 mb-8">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div className="flex flex-wrap gap-2">
            {product.badge && <span className={`px-3 py-1 rounded-xl text-xs font-black shadow-sm ${getBadgeStyle(product.badge)}`}>{product.badge}</span>}
            {product.category && <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-500/20 text-xs font-bold rounded-xl">{product.category}</span>}
          </div>
          <span className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 border ${isAvailable ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700"}`}>
            <span className={`w-2 h-2 rounded-full ${isAvailable ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" : "bg-slate-400"}`} />
            {isAvailable ? "موجود در انبار" : product.status}
          </span>
        </div>

        <h1 className="text-[22px] md:text-2xl font-black leading-snug text-slate-900 dark:text-white">{product.name}</h1>
        
        <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {new Date(product.created_at).toLocaleDateString("fa-IR")}</span>
          <span className="flex items-center gap-1 text-amber-500"><Star className="w-4 h-4 fill-current" /> {avgRating}</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-[28px] p-6 mb-8 flex justify-between items-center relative overflow-hidden group">
        <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700" />
        <div>
          <p className="text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-widest mb-1 opacity-80">قیمت کالا</p>
          <p className="text-3xl md:text-4xl font-black text-indigo-700 dark:text-indigo-300 tracking-tight">
            {product.price ? formatPrice(product.price) : "توافقی"}
          </p>
        </div>
      </div>

      {product.description && (
        <div className="mb-8">
          <h3 className="font-black text-lg text-slate-900 dark:text-white mb-3">توضیحات</h3>
          <p className="text-sm leading-loose text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-[24px] p-5 flex items-start gap-4 mb-8">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 dark:text-amber-300 text-sm mb-1">هشدار امنیتی</h4>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/80 leading-relaxed font-bold">پیش از اطمینان از صحت کالا، از پرداخت هرگونه بیعانه خودداری کنید و معامله را ترجیحاً حضوری انجام دهید.</p>
        </div>
      </div>
    </>
  );
});