import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Store as StoreIcon, BadgeCheck, ShieldCheck, MapPin, Star, Users, ShoppingBag, ChevronLeft } from "lucide-react";
import { StoreItem } from "../types";

const PLACEHOLDER = "https://placehold.co/150x150/e0e7ff/4f46e5?text=Store";

function isVerified(store: StoreItem): boolean {
  return store.blue_tick_expires_at ? new Date(store.blue_tick_expires_at) > new Date() : false;
}

function fmtNum(v?: number): string {
  return Number(v || 0).toLocaleString("fa-IR");
}

function fmtRating(v?: number): string {
  if (v == null || !Number.isFinite(Number(v))) return "—";
  return Number(v).toFixed(1);
}

function cityLine(store: StoreItem): string {
  return [store.city, store.province].filter(Boolean).join("، ") || "نامشخص";
}

export const StoreCard = memo(({ store, index }: { store: StoreItem; index: number; }) => {
  const verified = isVerified(store);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ delay: Math.min(index * 0.03, 0.15), type: "spring", stiffness: 300, damping: 25 }}
      className="group"
    >
      <Link
        to={`/store/${store.id}`}
        className="relative block overflow-hidden rounded-[1.5rem] border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 active:scale-[0.985]"
      >
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-indigo-500/[0.03] via-transparent to-fuchsia-500/[0.03]" />
        <div className="relative p-4 flex items-center gap-4">
          <div className="relative w-16 h-16 shrink-0">
            <div className={`w-full h-full rounded-2xl overflow-hidden transition-colors ${verified ? "p-[2px] bg-gradient-to-br from-blue-400 to-indigo-500 shadow-sm" : "bg-gray-100 dark:bg-gray-800"}`}>
              <div className="w-full h-full rounded-[14px] overflow-hidden bg-white dark:bg-gray-900 border border-gray-100/50 flex items-center justify-center">
                {store.image_url ? (
                  <img src={store.image_url} alt={store.name} loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).src = PLACEHOLDER; }} className="w-full h-full object-cover" />
                ) : (
                  <StoreIcon className={`w-7 h-7 ${verified ? "text-indigo-400" : "text-gray-400"}`} />
                )}
              </div>
            </div>
            {verified && <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-white dark:border-gray-900 flex items-center justify-center shadow-sm"><BadgeCheck className="w-4.5 h-4.5 text-blue-500" /></span>}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1.5">
              <h3 className="text-[15px] font-black text-gray-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">{store.name}</h3>
              {verified && <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-50 text-blue-600"><ShieldCheck className="w-3 h-3" /> تأییدشده</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px] mb-2.5">
              <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 font-black px-2.5 py-0.5 rounded-lg">{store.category || "عمومی"}</span>
              <span className="flex items-center gap-1 text-gray-500 font-medium"><MapPin className="w-3 h-3" /> {cityLine(store)}</span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-gray-600 font-bold">
              {store.avg_rating != null && <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-md"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {fmtRating(store.avg_rating)}</span>}
              {store.review_count != null && <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5 text-gray-400" /> {fmtNum(store.review_count)} نظر</span>}
              {store.product_count != null && <span className="inline-flex items-center gap-1"><ShoppingBag className="w-3.5 h-3.5 text-gray-400" /> {fmtNum(store.product_count)} کالا</span>}
            </div>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors"><ChevronLeft className="w-4 h-4" /></div>
        </div>
      </Link>
    </motion.div>
  );
});