import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { MapPin, ShoppingBag, Heart } from "lucide-react";
import { formatPrice } from "../../../utils";
import { Product } from "../../../hooks/useInfiniteProducts";
import { SPRING_TRANSITION } from "../constants";

// ============================================================
// ProductCardSkeleton — اسکلت لودینگ کارت محصول
// ============================================================
export const ProductCardSkeleton = memo(() => (
  <div className="product-card overflow-hidden">
    <div className="relative aspect-square skeleton">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-tertiary)]/50" />
    </div>
    <div className="p-3.5 space-y-3">
      <div className="space-y-2">
        <div className="skeleton h-3.5 w-full rounded-lg" />
        <div className="skeleton h-3.5 w-2/3 rounded-lg" />
      </div>
      <div className="flex justify-between items-end pt-1">
        <div className="space-y-1.5">
          <div className="skeleton h-2.5 w-12 rounded-md" />
          <div className="skeleton h-4 w-20 rounded-lg" />
        </div>
        <div className="skeleton h-6 w-6 rounded-full" />
      </div>
    </div>
  </div>
));

// ============================================================
// PremiumProductCard — کارت اصلی محصول
// ============================================================
export const PremiumProductCard = memo(({ product, isFavorite, onToggleFavorite }: { product: Product; isFavorite: boolean; onToggleFavorite: (id: string) => void }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const hasDiscount = !!product.badge;

  return (
    <Link to={`/product/${product.id}`} className="product-card group">
      {/* ── بخش تصویر ── */}
      <div className="product-img-wrapper">
        {product.image_url ? (
          <>
            <div className={`absolute inset-0 skeleton transition-opacity duration-500 ${imageLoaded ? "opacity-0" : "opacity-100"}`} />
            <img src={product.image_url} alt={product.name} className={`product-img transition-opacity duration-500 ${imageLoaded ? "opacity-100" : "opacity-0"}`} loading="lazy" onLoad={() => setImageLoaded(true)} />
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[var(--bg-tertiary)]">
            <ShoppingBag className="w-10 h-10 text-[var(--text-muted)]/50" />
          </div>
        )}

        <div className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />

        {hasDiscount && <div className="product-discount-badge">{product.badge}</div>}

        <button 
          className="absolute top-2.5 left-2.5 w-9 h-9 rounded-full flex items-center justify-center z-10 active:scale-90 transition-all duration-200 bg-black/20 backdrop-blur-md border border-white/20 hover:bg-black/30"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product.id); }}
        >
          <Heart className={`w-4 h-4 transition-all duration-300 ${isFavorite ? "fill-rose-500 text-rose-500 scale-110" : "text-white drop-shadow"}`} />
        </button>

        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-black/25 backdrop-blur-md text-white text-[10px] font-bold border border-white/10">
            <MapPin className="w-2.5 h-2.5 opacity-80" /> {product.city}
          </span>
        </div>
      </div>

      {/* ── بخش اطلاعات ── */}
      <div className="product-info">
        <h4 className="product-title">{product.name}</h4>
        <div className="product-price-row">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-[var(--text-muted)] font-semibold leading-none">قیمت</span>
            <span className="product-price">{product.price ? formatPrice(product.price) : "توافقی"}</span>
          </div>
          {product.status === "موجود" ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-primary)] animate-pulse" />
              <span className="text-[10px] font-bold text-[var(--brand-primary)]">موجود</span>
            </span>
          ) : (
            <span className="badge badge-soft-danger">ناموجود</span>
          )}
        </div>
      </div>
    </Link>
  );
});

// ============================================================
// SegmentedScope — سوئیچ شهر / استان / سراسری
// ============================================================
export const SegmentedScope = memo(({ scope, onScopeChange, city, province }: any) => {
  const tabs = [
    { key: "city" as const, label: city || "شهر من" },
    { key: "province" as const, label: province || "استان" },
    { key: "all" as const, label: "سراسری" },
  ];

  return (
    <motion.div variants={{ hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0 } }} className="bg-[var(--bg-tertiary)] p-1.5 rounded-[20px] flex relative">
      {tabs.map((tab) => {
        const isActive = scope === tab.key;
        return (
          <button key={tab.key} onClick={() => onScopeChange(tab.key)} className={`relative flex-1 py-2.5 text-xs font-black z-10 transition-colors duration-200 ${isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>
            {isActive && <motion.div layoutId="activeTabIndicator" transition={SPRING_TRANSITION} className="absolute inset-0 bg-[var(--bg-secondary)] rounded-[16px] shadow-sm border border-[var(--border-light)]/40 -z-10" />}
            <span className="block truncate px-1">{tab.label}</span>
          </button>
        );
      })}
    </motion.div>
  );
});