import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { searchListings, toFa } from "../../presence/engine";
import PresenceMap from "../../components/presence/PresenceMap";
import { ListingCard } from "../../components/presence/ListingCard";
import { listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import PageHero from "../../components/presence/PageHero";
import PresenceEmpty from "../../components/presence/EmptyState";

export default function ExplorePage() {
  const { origin } = usePresenceOrigin();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState<string>();
  const [trip, setTrip] = useState(() => listTripIds());
  const listings = useMemo(
    () => searchListings(origin, { q: query, inStock: true, sort: "nearest" }),
    [origin, query]
  );

  useEffect(() => onTripChange(() => setTrip(listTripIds())), []);
  useEffect(() => setQuery(q), [q]);

  return (
    <div className="grid min-h-[calc(100dvh-73px)] lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative z-0 h-[46vh] lg:h-auto">
        <PresenceMap origin={origin} listings={listings} selectedId={selected} height="100%" />
        <div className="absolute top-3 right-3 left-3 z-10">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="روی نقشه جستجو کن"
            className="presence-card h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
          />
        </div>
      </div>
      <div className="max-h-[54vh] space-y-3 overflow-y-auto p-4 lg:max-h-[calc(100dvh-73px)]">
        <PageHero kicker="LIVE MAP" title="نقشهٔ موجودی زنده">
          Airbnb برای ویترین مغازه‌ها — نه دیوار آگهی، نه انبار مرکزی. {toFa(listings.length)} کالا در محدوده.
        </PageHero>
        {listings.map((listing) => (
          <div key={listing.id} onMouseEnter={() => setSelected(listing.id)} onFocus={() => setSelected(listing.id)} onClick={() => setSelected(listing.id)}>
            <ListingCard
              listing={listing}
              compact
              inTrip={trip.includes(listing.id)}
              onToggleTrip={(id) => setTrip(toggleTrip(id))}
            />
          </div>
        ))}
        {listings.length === 0 && <PresenceEmpty title="چیزی روی نقشه پیدا نشد" hint="عبارت دیگری جستجو کن یا محله را عوض کن." />}
      </div>
    </div>
  );
}
