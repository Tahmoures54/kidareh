import React, { memo } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, Footprints, Plus, Radio } from "lucide-react";
import type { EnrichedListing } from "../../presence/types";
import { formatCompactToman, formatWalk, toFa } from "../../presence/engine";
import { CATEGORY_META } from "../../presence/catalog";
import { cn } from "../../utils";

interface Props {
  listing: EnrichedListing;
  compact?: boolean;
  inTrip?: boolean;
  onToggleTrip?: (id: string) => void;
}

export const ListingCard = memo(function ListingCard({ listing, compact, inTrip, onToggleTrip }: Props) {
  const cat = CATEGORY_META[listing.category];
  return (
    <article className={cn("presence-card group relative overflow-hidden rounded-[28px] transition-transform duration-300 hover:-translate-y-0.5", compact && "rounded-2xl")}>
      <Link to={`/p/${listing.id}`} className="absolute inset-0 z-10" aria-label={listing.name} />
      <div className={cn("relative overflow-hidden bg-[#ddd6c8]", compact ? "aspect-[5/4]" : "aspect-[4/5]")}>
        <img
          src={listing.image}
          alt=""
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {listing.openNow ? (
            <span className="rounded-full bg-[#157a4b] px-2.5 py-1 text-[10px] font-black text-white">باز است</span>
          ) : (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white">بسته</span>
          )}
          {listing.store.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[#0e6f63]">
              <BadgeCheck className="h-3 w-3" /> تأییدشده
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-[#14161c]">
            <Footprints className="h-3.5 w-3.5 text-[#0e6f63]" />
            {formatWalk(listing.walkMinutes)}
          </span>
          {listing.savingsPct > 0 && (
            <span className="rounded-full bg-[#b68a3a] px-2 py-1 text-[10px] font-black text-white">
              {toFa(listing.savingsPct)}٪ کمتر
            </span>
          )}
        </div>
      </div>
      <div className={cn("space-y-2 p-4", compact && "p-3")}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[#6b7168]">
          <span>
            {cat.emoji} {cat.label} · {listing.neighborhood.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {listing.freshnessLabel}
          </span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[#14161c]">{listing.name}</h3>
        <p className="text-xs font-bold text-[#3d433c]">
          {listing.store.name}
          <span className="text-[#6b7168]"> · {listing.stockLabel}</span>
        </p>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            {listing.oldPrice ? (
              <p className="text-[11px] font-bold text-[#9aa196] line-through">{formatCompactToman(listing.oldPrice)}</p>
            ) : null}
            <p className="text-lg font-black tracking-tight text-[#14161c]">{formatCompactToman(listing.price)}</p>
          </div>
          <div className="relative z-20 flex items-center gap-1.5">
            <Link
              to={`/radar?sku=${listing.sku}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[#0e6f63]"
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
                  onToggleTrip(listing.id);
                }}
                className={cn(
                  "inline-flex h-9 items-center gap-1 rounded-2xl px-3 text-[11px] font-black",
                  inTrip ? "bg-[#14161c] text-white" : "bg-[#0e6f63] text-white"
                )}
              >
                <Plus className={cn("h-3.5 w-3.5", inTrip && "rotate-45")} />
                {inTrip ? "مسیر" : "مسیر"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
