import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Eye, Edit, Share2, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { formatPrice, getBadgeStyle } from "../../../utils";
import { Product } from "../types";
import { FALLBACK_IMAGE, STATUS_STYLE_ANY } from "./constants";

interface ProductItemProps {
  product: Product;
  isUpdating: boolean;
  isDeleting: boolean;
  onStatusChange: (p: Product) => void;
  onDelete: (id: number) => void;
  onShare: (p: Product) => void;
}

export const ProductItem = React.memo(({ product, isUpdating, isDeleting, onStatusChange, onDelete, onShare }: ProductItemProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const photo = product.image_url || product.image || FALLBACK_IMAGE;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="presence-card relative flex gap-3 rounded-[22px] p-3 pl-14"
    >
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-xl bg-[var(--paper-2)]">
        <img
          src={photo}
          alt={product.name}
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
          }}
          className="h-full w-full object-cover"
        />
        {product.badge && (
          <span className={`absolute inset-x-0 bottom-0 py-0.5 text-center text-[9px] font-black text-white ${getBadgeStyle(product.badge)}`}>
            {product.badge}
          </span>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          <h4 className="line-clamp-1 text-sm font-black text-[var(--ink)]">{product.name}</h4>
          <div className="mt-1.5 flex items-center gap-3">
            <span className="text-sm font-black text-[var(--accent)]">
              {formatPrice(product.price)} <span className="text-[10px] font-normal text-[var(--muted)]">تومان</span>
            </span>
            <span className="flex items-center gap-1 rounded-md bg-[var(--paper)] px-2 py-0.5 text-[11px] font-medium text-[var(--muted)]">
              <Eye className="h-3 w-3" />
              {product.views.toLocaleString("fa-IR")}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onStatusChange(product)}
          disabled={isUpdating}
          className={`min-h-11 rounded-xl border px-3 text-xs font-black transition-all disabled:opacity-50 ${STATUS_STYLE_ANY[product.status] || STATUS_STYLE_ANY.موجود}`}
        >
          {isUpdating ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : `وضعیت: ${product.status} · بزن عوض شود`}
        </button>
      </div>

      <div className="absolute left-3 top-3 z-10">
        <button
          type="button"
          onClick={() => setShowMenu(!showMenu)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--line)] bg-white shadow-sm"
          aria-label="گزینه‌های کالا"
        >
          <MoreHorizontal className="h-4 w-4 text-[var(--ink-soft)]" />
        </button>

        <AnimatePresence>
          {showMenu && (
            <>
              <button type="button" className="fixed inset-0 z-10" aria-label="بستن منو" onClick={() => setShowMenu(false)} />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute left-0 top-12 z-20 w-44 overflow-hidden rounded-xl border border-[var(--line)] bg-white shadow-xl"
              >
                <Link
                  to={`/seller?edit=${product.id}`}
                  onClick={() => setShowMenu(false)}
                  className="flex min-h-12 items-center gap-2 px-4 text-sm font-bold text-[var(--ink)]"
                >
                  <Edit className="h-4 w-4" /> ویرایش
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    onShare(product);
                    setShowMenu(false);
                  }}
                  className="flex min-h-12 w-full items-center gap-2 px-4 text-sm font-bold text-[var(--ink)]"
                >
                  <Share2 className="h-4 w-4" /> اشتراک‌گذاری
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDelete(product.id);
                    setShowMenu(false);
                  }}
                  className={`flex min-h-12 w-full items-center gap-2 border-t border-[var(--line)] px-4 text-sm font-bold ${
                    isDeleting ? "bg-rose-500 text-white" : "text-rose-600"
                  }`}
                >
                  {isDeleting ? (
                    <>
                      <AlertTriangle className="h-4 w-4" /> مطمئنی؟ دوباره بزن
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" /> حذف
                    </>
                  )}
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
