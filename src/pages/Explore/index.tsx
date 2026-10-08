import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, MapPin } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { useAppLocation } from "../../hooks/useAppLocation";
import { searchListings } from "../../presence/engine";
import PresenceMap from "../../components/presence/PresenceMap";
import { ListingCard } from "../../components/presence/ListingCard";
import { listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import PageHero from "../../components/presence/PageHero";
import PresenceEmpty from "../../components/presence/EmptyState";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function ExplorePage() {
  const { origin } = usePresenceOrigin();
  const { location: cityLocation, isTehran } = useAppLocation();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [query, setQuery] = useState(q);
  const [selected, setSelected] = useState<string>();
  const [trip, setTrip] = useState(() => listTripIds());
  const listings = useMemo(
    () => (isTehran ? searchListings(origin, { q: query, inStock: true, sort: "nearest" }) : []),
    [isTehran, origin, query]
  );

  useEffect(() => onTripChange(() => setTrip(listTripIds())), []);
  useEffect(() => setQuery(q), [q]);

  return (
    <div className="grid min-h-[calc(100dvh-73px)] lg:grid-cols-[26rem_minmax(0,1fr)]">
      {/* Map */}
      <div className="order-1 relative z-0 h-[46vh] lg:order-2 lg:h-auto">
        <PresenceMap origin={origin} listings={listings} selectedId={selected} height="100%" />
        <div className="absolute top-3 right-3 left-3 z-10">
          <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3.5 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
            <Search className="h-4.5 w-4.5 shrink-0 text-cyan-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="روی نقشه جستجو کن…"
              className="h-12 w-full bg-transparent text-sm font-bold text-slate-800 outline-none placeholder:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-lg px-2 py-1 text-[11px] font-black text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                پاک
              </button>
            )}
          </div>
        </div>
        {listings.length > 0 && (
          <div className="absolute bottom-3 right-3 z-10 rounded-full bg-white/95 px-3 py-1.5 text-[11px] font-black text-cyan-700 shadow-md backdrop-blur">
            {listings.length.toLocaleString("fa-IR")} کالا روی نقشه
          </div>
        )}
      </div>

      {/* List */}
      <div className="order-2 max-h-[54vh] space-y-3 overflow-y-auto p-4 lg:order-1 lg:max-h-[calc(100dvh-73px)]">
        <PageHero kicker={`نقشه ${cityLocation.city}`} title="کجا هست و کی داره">
          {isTehran
            ? "مغازه‌های اطراف را روی نقشه ببین. هر پین یک کالا است که الان موجود است."
            : `نقشه حضوری فعلاً برای محله‌های تهران است. کالاهای ${cityLocation.city} را از جستجو ببین.`}
        </PageHero>

        {listings.length > 0 && (
          <div className="mb-1 flex items-center gap-2 rounded-xl bg-cyan-50/80 px-3 py-2 text-xs font-bold text-cyan-700">
            <MapPin className="h-3.5 w-3.5" />
            {listings.length.toLocaleString("fa-IR")} گزینه نزدیک شما
          </div>
        )}

        {listings.map((listing, i) => (
          <motion.div
            key={listing.id}
            custom={i}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            onMouseEnter={() => setSelected(listing.id)}
            onFocus={() => setSelected(listing.id)}
            onClick={() => setSelected(listing.id)}
            className={selected === listing.id ? "ring-2 ring-cyan-400/50 rounded-2xl" : ""}
          >
            <ListingCard
              listing={listing}
              compact
              inTrip={trip.includes(listing.id)}
              onToggleTrip={(id) => setTrip(toggleTrip(id))}
            />
          </motion.div>
        ))}

        {listings.length === 0 && (
          <PresenceEmpty
            title={isTehran ? "چیزی روی نقشه پیدا نشد" : `هنوز پین حضوری در ${cityLocation.city} نیست`}
            hint={isTehran ? "عبارت دیگری جستجو کن یا محله را عوض کن." : "شهر را از هدر عوض کن یا کالاها را در جستجو ببین."}
            actionTo={isTehran ? undefined : "/search"}
            actionLabel={isTehran ? undefined : "جستجوی کالا"}
          />
        )}
      </div>
    </div>
  );
}
