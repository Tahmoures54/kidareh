import React, { memo } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, Footprints, Minus, Plus, Radio } from "lucide-react";
import type { EnrichedListing } from "../../presence/types";
import { formatCompactToman, formatWalk, toFa } from "../../presence/engine";
import { CATEGORY_META } from "../../presence/catalog";
import { cn } from "../../utils";
import PresenceImage from "./PresenceImage";
import { useHaptics } from "../../hooks/useHaptics";

interface Props {
  listing: EnrichedListing;
  compact?: boolean;
  inTrip?: boolean;
  onToggleTrip?: (id: string) => void;
}

export const ListingCard = memo(function ListingCard({ listing, compact, inTrip, onToggleTrip }: Props) {
  const cat = CATEGORY_META[listing.category];
  const haptic = useHaptics();
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "group relative z-0 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-lg",
        compact && "rounded-2xl"
      )}
    >
      <Link to={`/p/${listing.id}`} className="absolute inset-0 z-[1]" aria-label={listing.name} />
      <div className={cn("relative overflow-hidden bg-slate-100", compact ? "aspect-[5/4]" : "aspect-[16/10] sm:aspect-[4/5]")}>
        <PresenceImage
          src={listing.image}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/5 to-black/10" />
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {listing.openNow ? (
            <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">باز است</span>
          ) : (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">بسته</span>
          )}
          {listing.store.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2 py-1 text-[10px] font-black text-cyan-600 shadow-sm">
              <BadgeCheck className="h-3 w-3" /> تأییدشده
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-slate-800 shadow-sm">
            <Footprints className="h-3.5 w-3.5 text-cyan-600" />
            {formatWalk(listing.walkMinutes)}
          </span>
          {listing.savingsPct > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-1 text-[10px] font-black text-white shadow-sm">
              {toFa(listing.savingsPct)}٪ کمتر
            </span>
          )}
        </div>
      </div>
      <div className={cn("space-y-2 p-4", compact && "p-3")}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-slate-400">
          <span>
            {cat.emoji} {cat.label} · {listing.neighborhood.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {listing.freshnessLabel}
          </span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-slate-900">{listing.name}</h3>
        <p className="text-xs font-bold text-slate-500">
          {listing.store.name}
          <span className="text-slate-400"> · {listing.stockLabel}</span>
        </p>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            {listing.oldPrice ? (
              <p className="text-[11px] font-bold text-slate-400 line-through">{formatCompactToman(listing.oldPrice)}</p>
            ) : null}
            <p className="text-lg font-black tracking-tight text-cyan-600">{formatCompactToman(listing.price)}</p>
          </div>
          <div className="relative z-20 flex items-center gap-1.5">
            <Link
              to={`/radar?sku=${listing.sku}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-cyan-600 transition hover:border-cyan-300 hover:bg-cyan-50"
              aria-label="رادار قیمت"
            >
              <Radio className="h-4 w-4" />
            </Link>
            {onToggleTrip && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  haptic("selection");
                  onToggleTrip(listing.id);
                }}
                className={cn(
                  "inline-flex h-11 items-center gap-1 rounded-xl px-3 text-sm font-black shadow-sm transition",
                  inTrip
                    ? "bg-sky-500 text-white hover:bg-sky-600"
                    : "bg-gradient-to-l from-cyan-600 to-teal-500 text-white hover:opacity-95"
                )}
              >
                {inTrip ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {inTrip ? "حذف" : "مسیر"}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.article>
  );
});
