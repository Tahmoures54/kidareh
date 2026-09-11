import React, { memo } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Clock3, Footprints, Minus, Plus, Radio } from "lucide-react";
import type { EnrichedListing } from "../../presence/types";
import { formatCompactToman, formatWalk, toFa } from "../../presence/engine";
import { CATEGORY_META } from "../../presence/catalog";
import { cn } from "../../utils";
import PresenceImage from "./PresenceImage";

interface Props {
  listing: EnrichedListing;
  compact?: boolean;
  inTrip?: boolean;
  onToggleTrip?: (id: string) => void;
}

export const ListingCard = memo(function ListingCard({ listing, compact, inTrip, onToggleTrip }: Props) {
  const cat = CATEGORY_META[listing.category];
  return (
    <article
      className={cn(
        "presence-card group relative z-0 overflow-hidden rounded-[28px] transition-transform duration-300 hover:-translate-y-0.5",
        compact && "rounded-2xl"
      )}
    >
      <Link to={`/p/${listing.id}`} className="absolute inset-0 z-[1]" aria-label={listing.name} />
      <div className={cn("relative overflow-hidden bg-[var(--paper-2)]", compact ? "aspect-[5/4]" : "aspect-[16/10] sm:aspect-[4/5]")}>
        <PresenceImage
          src={listing.image}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/10" />
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {listing.openNow ? (
            <span className="rounded-full bg-[var(--ok)] px-2.5 py-1 text-[10px] font-black text-white">باز است</span>
          ) : (
            <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white">بسته</span>
          )}
          {listing.store.verified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black text-[var(--accent)]">
              <BadgeCheck className="h-3 w-3" /> تأییدشده
            </span>
          )}
        </div>
        <div className="absolute bottom-3 right-3 left-3 flex items-end justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-[var(--ink)]">
            <Footprints className="h-3.5 w-3.5 text-[var(--accent)]" />
            {formatWalk(listing.walkMinutes)}
          </span>
          {listing.savingsPct > 0 && (
            <span className="rounded-full bg-[var(--gold)] px-2 py-1 text-[10px] font-black text-white">
              {toFa(listing.savingsPct)}٪ کمتر
            </span>
          )}
        </div>
      </div>
      <div className={cn("space-y-2 p-4", compact && "p-3")}>
        <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-[var(--muted)]">
          <span>
            {cat.emoji} {cat.label} · {listing.neighborhood.name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3 w-3" />
            {listing.freshnessLabel}
          </span>
        </div>
        <h3 className="line-clamp-2 text-[15px] font-black leading-snug text-[var(--ink)]">{listing.name}</h3>
        <p className="text-xs font-bold text-[var(--ink-soft)]">
          {listing.store.name}
          <span className="text-[var(--muted)]"> · {listing.stockLabel}</span>
        </p>
        <div className="flex items-end justify-between gap-2 pt-1">
          <div>
            {listing.oldPrice ? (
              <p className="text-[11px] font-bold text-[var(--muted)] line-through">{formatCompactToman(listing.oldPrice)}</p>
            ) : null}
            <p className="text-lg font-black tracking-tight text-[var(--accent)]">{formatCompactToman(listing.price)}</p>
          </div>
          <div className="relative z-20 flex items-center gap-1.5">
            <Link
              to={`/radar?sku=${listing.sku}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--line)] bg-white text-[var(--accent)]"
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
                  "inline-flex h-11 items-center gap-1 rounded-2xl px-3 text-sm font-black",
                  inTrip ? "bg-[var(--accent-2)] text-white" : "bg-[var(--accent)] text-white"
                )}
              >
                {inTrip ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {inTrip ? "حذف" : "مسیر"}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});
