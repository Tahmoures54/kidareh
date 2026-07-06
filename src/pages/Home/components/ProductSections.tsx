import React, { memo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Heart, ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { formatPrice } from "../../../utils";
import { Product } from "../../../hooks/useInfiniteProducts";

export const ProductCardSkeleton = memo(() => (
  <div className="space-y-2">
    <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
    <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
    <div className="flex justify-between items-center mt-2">
      <div className="h-4 w-1/3 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
      <div className="h-3 w-1/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
    </div>
  </div>
));

interface PremiumProductCardProps {
  product: Product;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } }
};

export const PremiumProductCard = memo(({ product, isFavorite, onToggleFavorite }: PremiumProductCardProps) => {
  const [imgError, setImgError] = useState(false);
  const isFree = !product.price;

  return (
    <motion.div variants={itemVariants} className="group">
      <Link to={`/product/${product.id}`} className="block">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
          {!imgError && product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-10 h-10 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* گرادیانت نازک پایین عکس برای خوانایی بهتر آیکون‌ها در حالت هاور */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <button
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(product.id); }}
            aria-label={isFavorite ? "حذف از علاقه‌مندی‌ها" : "افزودن به علاقه‌مندی‌ها"}
            className="absolute top-2.5 left-2.5 w-8 h-8 rounded-full bg-white/80 dark:bg-black/40 backdrop-blur-md flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 active:scale-90"
          >
            <Heart className={`w-4 h-4 transition-colors ${isFavorite ? "fill-rose-500 text-rose-500" : "text-slate-700 dark:text-white"}`} />
          </button>

          {product.badge && (
            <span className="absolute top-2.5 right-2.5 px-2 py-1 bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow-sm">
              {product.badge}
            </span>
          )}
        </div>

        <div className="pt-2.5 px-0.5 pb-2">
          <h3 className="text-sm font-medium text-gray-800 dark:text-gray-100 line-clamp-2 leading-5 mb-1.5 min-h-[2.5rem]">
            {product.name}
          </h3>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {isFree ? "رایگان" : formatPrice(product.price)}
              {!isFree && <span className="text-[10px] font-normal text-gray-500 mr-1">تومان</span>}
            </span>
            <span className="text-[11px] text-gray-400 flex items-center gap-1 truncate max-w-[40%]">
              <MapPin className="w-3 h-3 shrink-0" /> 
              <span className="truncate">{product.city}</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
});

interface SegmentedScopeProps {
  scope: "city" | "all";
  onScopeChange: (scope: "city" | "all") => void;
  city: string;
}

export const SegmentedScope = memo(({ scope, onScopeChange, city }: SegmentedScopeProps) => {
  const tabs = [
    { key: "city" as const, label: city || "شهر من" },
    { key: "all" as const, label: "سراسری" },
  ];

  return (
    <div className="flex p-1 bg-gray-100 dark:bg-gray-800/50 rounded-xl gap-1">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onScopeChange(tab.key)}
          className={`relative flex-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors duration-200 ${
            scope === tab.key 
              ? "text-gray-900 dark:text-white" 
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          {scope === tab.key && (
            <motion.div
              layoutId="activeScopePill"
              className="absolute inset-0 bg-white dark:bg-gray-900 rounded-lg shadow-sm"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
          <span className="relative z-10 truncate">{tab.label}</span>
        </button>
      ))}
    </div>
  );
});