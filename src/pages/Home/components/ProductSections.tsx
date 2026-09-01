import React, { memo, useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { MapPin, Heart, ShoppingBag, Store, Eye } from "lucide-react";
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

    // ریست کردن خطای تصویر هنگام تغییر آدرس تصویر یا شناسه محصول
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
      <motion.div variants={itemVariants} className="group relative">
        {/* لینک اصلی کل کارت را پوشش می‌دهد */}
        <Link
          to={`/product/${product.id}`}
          className="absolute inset-0 z-0"
          aria-label={`مشاهده ${product.name}`}
        />

        {/* Image Container */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800 mb-2.5">
          {!imgError && product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
              <ShoppingBag className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Overlay gradient on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

          {/* Favorite Button - outside Link overlay */}
          <button
            onClick={handleFavoriteClick}
            aria-label={
              isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"
            }
            className="absolute top-2.5 left-2.5 z-20 w-9 h-9 rounded-full bg-white/90 dark:bg-black/60 backdrop-blur-md flex items-center justify-center transition-all duration-300 md:opacity-0 md:group-hover:opacity-100 active:scale-90 shadow-lg"
          >
            <Heart
              className={`w-[18px] h-[18px] transition-all ${
                isFavorite
                  ? "fill-rose-500 text-rose-500 scale-110"
                  : "text-gray-700 dark:text-white"
              }`}
            />
          </button>

          {/* Badge */}
          {product.badge && (
            <span className="absolute top-2.5 right-2.5 z-10 px-2.5 py-1 bg-rose-500 text-white text-[10px] font-extrabold rounded-lg shadow-md tracking-wide">
              {getCategoryTextByValue(product.badge)}
            </span>
          )}

          {/* View Count - On hover */}
          {product.views != null && product.views > 0 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-lg flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3 h-3 text-white" />
              <span className="text-[10px] font-bold text-white">
                {formatViews(product.views)}
              </span>
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="px-0.5 relative z-10">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-5 mb-2 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
            {product.name}
          </h3>

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-base font-black text-gray-900 dark:text-white">
              {isFree ? (
                <span className="text-green-600 dark:text-green-400">رایگان</span>
              ) : (
                <>
                  {formatPrice(product.price)}
                  <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400 mr-1">
                    تومان
                  </span>
                </>
              )}
            </span>
            <span className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate max-w-[45%]">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{product.city}</span>
            </span>
          </div>

          {product.store_name && (
            <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <Store className="w-3 h-3 shrink-0" />
              <span className="truncate">{product.store_name}</span>
            </div>
          )}
        </div>
      </motion.div>
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
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
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
