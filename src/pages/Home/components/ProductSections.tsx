import React, { memo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Heart, ShoppingBag, Store, Eye, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "../../../utils";
import { Product } from "../../../hooks/useInfiniteProducts";
import { getCategoryTextByValue } from "@data/processed/categories";

// -------------------- Skeleton --------------------
export const ProductCardSkeleton = memo(() => (
  <div className="space-y-2 animate-pulse">
    <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200 dark:bg-gray-800" />
    <div className="space-y-2 px-1">
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="flex justify-between items-center">
        <div className="h-5 w-1/3 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="h-3 w-2/5 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  </div>
));

ProductCardSkeleton.displayName = "ProductCardSkeleton";

// -------------------- Helpers --------------------
const formatViews = (views: number): string => {
  if (views < 1000) return views.toString();
  if (views < 1000000) {
    const value = views / 1000;
    return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}K`;
  }
  const value = views / 1000000;
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}M`;
};

// -------------------- Product Card --------------------
interface PremiumProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export const PremiumProductCard = memo(
  ({ product, isFavorite, onToggleFavorite }: PremiumProductCardProps) => {
    const [imgError, setImgError] = useState(false);
    const isFree = product.price == null || product.price === 0;

    useEffect(() => {
      setImgError(false);
    }, [product.image_url, product.id]);

    const handleFavoriteClick = useCallback(
      (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFavorite(product.id);
      },
      [onToggleFavorite, product.id]
    );

    return (
      <motion.article
        variants={itemVariants}
        className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-slate-200/90 bg-white p-2 shadow-[0_14px_35px_-30px_rgba(7,63,86,.7)] transition-all duration-300 hover:-translate-y-1 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-[0_22px_42px_-25px_rgba(8,76,103,.45)] sm:p-2.5 lg:p-3"
      >
        <Link to={`/products/${product.id}`} className="absolute inset-0 z-0" aria-label={`مشاهده ${product.name}`} />

        <div className="relative z-10 aspect-[4/5] w-full shrink-0 overflow-hidden rounded-[18px] bg-slate-100 sm:rounded-[18px]">
          {!imgError && product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-slate-100">
              <ShoppingBag className="h-10 w-10 text-slate-300" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <button
            type="button"
            onClick={handleFavoriteClick}
            aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            className="absolute left-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-md transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100"
          >
            <Heart className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-700"}`} />
          </button>

          {product.badge && (
            <span className="absolute right-2 top-2 z-10 max-w-[70%] truncate rounded-md bg-cyan-700 px-2 py-1 text-[9px] font-extrabold text-white shadow-sm">
              {getCategoryTextByValue(product.badge)}
            </span>
          )}

          {product.views != null && product.views > 0 && (
            <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-1 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <Eye className="h-3 w-3 text-white" />
              <span className="text-[9px] font-bold text-white">{formatViews(product.views)}</span>
            </div>
          )}
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-0.5 pt-2.5">
          <h3 className="line-clamp-2 min-h-[2.5rem] text-[13px] font-extrabold leading-5 text-slate-900 transition-colors group-hover:text-cyan-700 sm:text-sm">
            {product.name}
          </h3>

          <div className="mt-2 flex min-h-[2.25rem] items-center justify-between gap-2">
            <span className="min-w-0 truncate text-sm font-black text-[#073f56] sm:text-base">
              {isFree ? (
                <span className="text-green-600">رایگان</span>
              ) : (
                <>
                  {formatPrice(product.price)}
                  <span className="mr-1 text-[9px] font-normal text-slate-500">تومان</span>
                </>
              )}
            </span>
            <span className="flex min-w-0 max-w-[42%] shrink-0 items-center gap-1 truncate text-[10px] font-medium text-slate-500 sm:text-[11px]">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{product.city}</span>
            </span>
          </div>

          <div className="mt-auto min-h-[2.25rem] border-t border-slate-100 pt-2">
            {product.store_name ? (
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500 sm:text-[11px]">
                <Store className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="min-w-0 flex-1 truncate">{product.store_name}</span>
                <ChevronLeft className="h-3.5 w-3.5 shrink-0 text-cyan-600" />
              </div>
            ) : (
              <div className="h-4" aria-hidden="true" />
            )}
          </div>
        </div>
      </motion.article>
    );
  }
);

PremiumProductCard.displayName = "PremiumProductCard";

// -------------------- Segmented Scope --------------------
interface SegmentedScopeProps {
  scope: "city" | "all";
  onScopeChange: (scope: "city" | "all") => void;
  city: string;
}

export const SegmentedScope = memo(
  ({ scope, onScopeChange, city }: SegmentedScopeProps) => {
    const tabs = [
      { key: "city" as const, label: city || "شهر من" },
      { key: "all" as const, label: "همه ایران" },
    ];

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent, currentKey: "city" | "all") => {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          const nextKey = currentKey === "city" ? "all" : "city";
          onScopeChange(nextKey);
        }
      },
      [onScopeChange]
    );

    return (
      <div
        className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl gap-1"
        role="tablist"
        aria-label="محدوده جستجو"
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            id={`scope-tab-${tab.key}`}
            role="tab"
            aria-selected={scope === tab.key}
            aria-controls={`scope-panel-${tab.key}`}
            tabIndex={scope === tab.key ? 0 : -1}
            onClick={() => onScopeChange(tab.key)}
            onKeyDown={(e) => handleKeyDown(e, tab.key)}
            className={`relative flex-1 px-4 py-2 rounded-lg text-xs font-bold transition-colors duration-200 ${
              scope === tab.key
                ? "text-gray-900 dark:text-white"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            }`}
          >
            {scope === tab.key && (
              <motion.div
                layoutId="activeScopePill"
                className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg shadow-sm"
                transition={{ type: "spring" as const, stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10 truncate">{tab.label}</span>
          </button>
        ))}
      </div>
    );
  }
);

SegmentedScope.displayName = "SegmentedScope";
