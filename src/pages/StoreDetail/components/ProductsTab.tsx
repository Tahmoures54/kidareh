import React, { memo } from "react";
import { Eye, Package } from "lucide-react";
import { Product } from "../types";
import { getBadgeStyle, formatPrice } from "../../../utils";

// یک تصویر پیش‌فرض برای محصولاتی که عکس ندارند
const FALLBACK_PRODUCT = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='16' font-family='sans-serif'%3Eبدون تصویر%3C/text%3E%3C/svg%3E";

export const ProductsTab = memo(({ products, onProductClick }: { products: Product[]; onProductClick: (id: number) => void }) => {
  if (products.length === 0) return (
    <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-light)]">
      <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
      <p className="text-sm font-bold text-[var(--text-muted)]">فروشگاه هنوز کالایی ثبت نکرده است</p>
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-4 pb-6">
      {products.map(p => (
        <button key={p.id} onClick={() => onProductClick(p.id)} className="bg-[var(--bg-secondary)] rounded-3xl overflow-hidden border border-[var(--border-light)] text-right active:scale-[0.98] transition-transform group shadow-sm flex flex-col w-full h-full">
          <div className="relative aspect-[4/5] bg-[var(--bg-tertiary)] overflow-hidden w-full shrink-0">
            <img 
              src={p.image_url || FALLBACK_PRODUCT} 
              alt={p.name} 
              loading="lazy" 
              onError={e => ((e.currentTarget as HTMLImageElement).src = FALLBACK_PRODUCT)} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
            />
            <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
            {p.badge && <span className={`absolute top-2 right-2 text-[9px] font-black px-2.5 py-1 rounded-xl shadow-sm backdrop-blur-md border border-white/20 ${getBadgeStyle(p.badge)}`}>{p.badge}</span>}
            <div className="absolute bottom-3 left-3 right-3 z-10 flex justify-between items-end">
              <span className={`inline-block text-[9px] font-black px-2.5 py-1 rounded-xl backdrop-blur-md ${p.status === "موجود" ? "bg-emerald-500/90 text-white border border-white/20" : "bg-black/60 text-white border border-white/10"}`}>{p.status || "نامشخص"}</span>
            </div>
          </div>
          <div className="p-3.5 flex flex-col flex-1">
            <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-tight mb-auto min-h-[40px]">{p.name}</h4>
            <div className="mt-3 flex items-end justify-between">
              <span className="text-sm font-black text-[var(--brand-primary)] tracking-tight">{p.price ? formatPrice(p.price) : "توافقی"}</span>
              <div className="flex items-center gap-0.5 text-[9px] text-[var(--text-muted)] font-bold">
                <Eye className="w-3 h-3" /> {(p.views || 0).toLocaleString("fa-IR")}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
});