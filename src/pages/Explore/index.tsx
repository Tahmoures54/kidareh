import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { searchListings } from "../../presence/engine";
import PresenceMap from "../../components/presence/PresenceMap";
import { ListingCard } from "../../components/presence/ListingCard";
import { listTripIds, toggleTrip } from "../../presence/tripBasket";

export default function ExplorePage() {
  const { origin } = usePresenceOrigin();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState<string>();
  const [trip, setTrip] = useState(() => listTripIds());
  const listings = useMemo(() => searchListings(origin, { q: query, inStock: true, sort: "nearest" }), [origin, query]);

  return (
    <div className="grid min-h-[calc(100dvh-73px)] lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="relative h-[46vh] lg:h-auto">
        <PresenceMap origin={origin} listings={listings} selectedId={selected} height="100%" />
        <div className="absolute top-3 right-3 left-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="روی نقشه جستجو کن"
            className="presence-card h-12 w-full rounded-2xl px-4 text-sm font-bold outline-none"
          />
        </div>
      </div>
      <div className="max-h-[54vh] space-y-3 overflow-y-auto p-4 lg:max-h-[calc(100dvh-73px)]">
        <h1 className="text-xl font-black">نقشهٔ موجودی زنده</h1>
        <p className="text-xs font-bold text-[#6b7168]">Airbnb برای ویترین مغازه‌ها — نه دیوار آگهی، نه انبار مرکزی.</p>
        {listings.map((listing) => (
          <div key={listing.id} onMouseEnter={() => setSelected(listing.id)} onFocus={() => setSelected(listing.id)}>
            <ListingCard
              listing={listing}
              compact
              inTrip={trip.includes(listing.id)}
              onToggleTrip={(id) => setTrip(toggleTrip(id))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
