import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Heart,
  Trash2,
  Share2,
  MapPin,
  CheckCircle2,
  TrendingDown,
} from "lucide-react";

// اگر در پروژه‌ات این ابزارها داری مسیرشان را درست وارد کن، اگر نه خطوطشان را کامنت کن
import { formatPrice } from "../../utils/formatPrice"; 
// import { LazyImage } from "../../utils/lazyLoad"; 

// --- Type Definitions ---

interface ProductData {
  id: string;
  name: string;
  price: number;
  oldPrice: number;
  store: string;
  status: string;
  distance: string;
  image: string;
  hasPriceDrop: boolean;
}

interface ProductCardProps {
  product: ProductData;
  
  // Props مربوط به صفحه Search
  index?: number;
  onShare?: (product: ProductData) => void;
  onNavigate?: (product: ProductData) => void;
  
  // Props مربوط به صفحه Saved
  viewMode?: "grid" | "list";
  onRemove?: (id: string) => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  selectionMode?: boolean;
}

// --- Skeleton Component (مخصوص صفحه Saved) ---

export function SavedSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" }) {
  const isGrid = viewMode === "grid";
  return (
    <div className={`animate-pulse ${isGrid ? "rounded-3xl overflow-hidden bg-white dark:bg-slate-800" : "flex gap-4 p-4 rounded-3xl bg-white dark:bg-slate-800"}`}>
      <div className={`${isGrid ? "w-full h-44" : "w-28 h-28 shrink-0 rounded-2xl"} bg-slate-200 dark:bg-slate-700`} />
      <div className={`flex-1 space-y-3 p-3 ${isGrid ? "pt-0" : ""}`}>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
        <div className="flex gap-2 mt-4">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full" />
          <div className="h-5 w-16 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </div>
      </div>
    </div>
  );
}

// --- Main ProductCard Component ---

export function ProductCard({
  product,
  index,
  onShare,
  onNavigate,
  viewMode = "grid",
  onRemove,
  isSelected = false,
  onToggleSelect,
  selectionMode = false,
}: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  
  // تشخیص اینکه کارت در کدام صفحه استفاده شده است
  const isSavedMode = !!onRemove;
  const isSearchMode = !!onNavigate;
  const isGrid = viewMode === "grid";

  const handleClick = () => {
    if (selectionMode && onToggleSelect) {
      onToggleSelect(product.id);
    } else if (isSearchMode && onNavigate) {
      onNavigate(product);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.3, delay: index ? index * 0.05 : 0 }}
      onClick={handleClick}
      className={`relative group overflow-hidden rounded-3xl border transition-all duration-300 cursor-pointer ${
        isSelected
          ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 ring-2 ring-indigo-500/30"
          : "border-slate-200/50 dark:border-slate-700/50 bg-white dark:bg-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 active:scale-[0.98]"
      } ${isGrid ? "flex flex-col" : "flex gap-4 p-3"}`}
    >
      {/* Image Container */}
      <div className={`relative overflow-hidden bg-slate-100 dark:bg-slate-700 ${isGrid ? "w-full aspect-square" : "w-28 h-28 shrink-0 rounded-2xl"}`}>
        {!imgError ? (
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            onError={() => setImgError(true)}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
              isGrid ? "" : "rounded-2xl"
            }`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-4xl">
            🖼️
          </div>
        )}

        {/* Overlays on Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        {/* Badges */}
        <div className="absolute top-2 right-2 flex flex-col gap-1.5">
          {product.hasPriceDrop && (
            <div className="flex items-center gap-1 bg-rose-500 text-white text-[10px] font-black px-2 py-1 rounded-xl shadow-lg">
              <TrendingDown className="w-3 h-3" />
              کاهش
            </div>
          )}
          {product.status === "ناموجود" && (
            <div className="bg-slate-900/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-xl">
              ناموجود
            </div>
          )}
        </div>

        {/* Checkbox for Saved Mode */}
        {isSavedMode && selectionMode && (
          <div className="absolute top-2 left-2">
            <div
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-indigo-600 border-indigo-600"
                  : "bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 backdrop-blur-sm"
              }`}
            >
              {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
            </div>
          </div>
        )}

        {/* Share Button for Search Mode */}
        {isSearchMode && onShare && (
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={(e) => {
              e.stopPropagation();
              onShare(product);
            }}
            className="absolute bottom-2 left-2 w-8 h-8 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Share2 className="w-4 h-4 text-slate-700 dark:text-slate-200" />
          </motion.button>
        )}
      </div>

      {/* Content Section */}
      <div className={`flex flex-col justify-between flex-1 ${isGrid ? "p-3 pt-2.5" : "py-1 flex-1"}`}>
        <div>
          <h3 className="font-bold text-sm text-slate-800 dark:text-white line-clamp-2 leading-5 mb-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{product.store} • {product.distance}</span>
          </div>
        </div>

        <div className="flex items-end justify-between mt-3">
          <div className="flex flex-col">
            {product.oldPrice > 0 && product.hasPriceDrop && (
              <span className="text-[11px] text-slate-400 dark:text-slate-500 line-through mb-0.5">
                {formatPrice(product.oldPrice)}
              </span>
            )}
            <span className="text-sm font-black text-slate-900 dark:text-white">
              {formatPrice(product.price)}
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mr-1">تومان</span>
            </span>
          </div>

          {/* Remove Button for Saved Mode */}
          {isSavedMode && !selectionMode && onRemove && (
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove(product.id);
              }}
              className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-rose-500"
            >
              <Trash2 className="w-4 h-4" />
            </motion.button>
          )}

          {/* Heart Icon for Search Mode (Optional visual) */}
          {isSearchMode && (
             <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center text-slate-400 dark:text-slate-500">
               <Heart className="w-4 h-4" />
             </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export default ProductCard;