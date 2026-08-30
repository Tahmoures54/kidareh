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
            {product.badge && (
              <span className={`px-3 py-1.5 rounded-xl text-xs font-black shadow-sm ${getBadgeStyle(product.badge)}`}>
                {product.badge}
              </span>
            )}
            {product.category && (
              <span className="px-3 py-1.5 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border border-[var(--brand-primary)]/20 text-xs font-bold rounded-xl">
                {product.category}
              </span>
            )}
          </div>
          <span
            className={`px-4 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 border ${
              isAvailable
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-light)]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isAvailable
                  ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                  : "bg-slate-400"
              }`}
            />
            {isAvailable ? "موجود" : product.status || "ناموجود"}
          </span>
        </div>

        <h1 className="text-2xl font-black leading-snug text-[var(--text-primary)]">{product.name}</h1>

        <div className="flex items-center gap-4 text-xs font-bold text-[var(--text-muted)]">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" /> {new Date(product.created_at).toLocaleDateString("fa-IR")}
          </span>
          <span className="flex items-center gap-1 text-amber-500">
            <Star className="w-4 h-4 fill-current" /> {avgRating}
          </span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-secondary)]/5 border border-[var(--brand-primary)]/20 rounded-3xl p-6 mb-8 flex justify-between items-center relative overflow-hidden group">
        <div className="absolute -left-6 -top-6 w-28 h-28 bg-[var(--brand-primary)]/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700" />
        <div>
          <p className="text-[var(--brand-primary)] text-xs font-black mb-1 opacity-80">قیمت</p>
          <p className="text-3xl md:text-4xl font-black text-[var(--brand-primary)] tracking-tight">
            {product.price ? (
              <>
                {formatPrice(product.price)}
                <span className="text-sm font-bold text-[var(--text-muted)] mr-1">تومان</span>
              </>
            ) : (
              "توافقی"
            )}
          </p>
        </div>
      </div>

      {product.description && (
        <div className="mb-8">
          <h3 className="font-black text-lg text-[var(--text-primary)] mb-3">توضیحات</h3>
          <p className="text-sm leading-loose text-[var(--text-secondary)] whitespace-pre-wrap">{product.description}</p>
        </div>
      )}

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30 rounded-3xl p-5 flex items-start gap-4 mb-8">
        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/30 rounded-xl flex items-center justify-center shrink-0">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h4 className="font-black text-amber-900 dark:text-amber-300 text-sm mb-1">یادت باشه</h4>
          <p className="text-xs text-amber-800/80 dark:text-amber-400/70 leading-relaxed font-bold">
            قبل از پرداخت بیعانه، کالا رو حضوری ببین. معامله رو ترجیحاً در مغازه انجام بده.
          </p>
        </div>
      </div>
    </>
  );
});
