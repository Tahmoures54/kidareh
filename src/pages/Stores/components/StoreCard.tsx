import React, { memo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Store as StoreIcon,
  BadgeCheck,
  ShieldCheck,
  MapPin,
  Star,
  Users,
  ShoppingBag,
  ChevronLeft,
} from "lucide-react";
import { StoreItem } from "../types";

const PLACEHOLDER = "https://placehold.co/150x150/ecfeff/0e7490?text=Store";

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

export const StoreCard = memo(({ store, index }: { store: StoreItem; index: number }) => {
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
        className="relative block overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-200 hover:shadow-lg hover:shadow-cyan-500/5 active:scale-[0.985]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-teal-500/[0.03] opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex items-center gap-4 p-4">
          <div className="relative h-16 w-16 shrink-0">
            <div
              className={`h-full w-full overflow-hidden rounded-2xl transition-colors ${
                verified
                  ? "bg-gradient-to-br from-cyan-400 to-teal-600 p-[2px] shadow-sm shadow-cyan-500/20"
                  : "bg-slate-100"
              }`}
            >
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-[14px] border border-slate-100/50 bg-white">
                {store.image_url ? (
                  <img
                    src={store.image_url}
                    alt={store.name}
                    loading="lazy"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = PLACEHOLDER;
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <StoreIcon className={`h-7 w-7 ${verified ? "text-cyan-500" : "text-slate-400"}`} />
                )}
              </div>
            </div>
            {verified && (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white shadow-sm">
                <BadgeCheck className="h-4 w-4 text-cyan-500" />
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-1.5">
              <h3 className="truncate text-[15px] font-black text-slate-900 transition-colors group-hover:text-cyan-700">
                {store.name}
              </h3>
              {verified && (
                <span className="hidden items-center gap-1 rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-black text-cyan-700 sm:inline-flex">
                  <ShieldCheck className="h-3 w-3" /> تأییدشده
                </span>
              )}
            </div>
            <div className="mb-2.5 flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded-lg bg-cyan-50 px-2.5 py-0.5 font-black text-cyan-700">
                {store.category || "عمومی"}
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-500">
                <MapPin className="h-3 w-3" /> {cityLine(store)}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-600">
              {store.avg_rating != null && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-600">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {fmtRating(store.avg_rating)}
                </span>
              )}
              {store.review_count != null && (
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-slate-400" /> {fmtNum(store.review_count)} نظر
                </span>
              )}
              {store.product_count != null && (
                <span className="inline-flex items-center gap-1">
                  <ShoppingBag className="h-3.5 w-3.5 text-slate-400" /> {fmtNum(store.product_count)} کالا
                </span>
              )}
            </div>
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 transition-colors group-hover:bg-cyan-50 group-hover:text-cyan-600">
            <ChevronLeft className="h-4 w-4" />
          </div>
        </div>
      </Link>
    </motion.div>
  );
});
