import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3, Footprints, Radio, Sparkles } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { CATEGORY_META } from "../../presence/catalog";
import { compareCopy, pulseStats, searchListings } from "../../presence/engine";
import type { ListingCategory, PresenceQuery } from "../../presence/types";
import { ListingCard } from "../../components/presence/ListingCard";
import PresenceMap from "../../components/presence/PresenceMap";
import { listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import { toFa } from "../../presence/geo";

const RADII = [
  { km: 0.8, label: "۸۰۰ م" },
  { km: 1.5, label: "۱٫۵ ک‌م" },
  { km: 3, label: "۳ ک‌م" },
  { km: 8, label: "کل شهر" },
];

export default function PresenceHome() {
  const { origin } = usePresenceOrigin();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<ListingCategory | "all">("all");
  const [radiusKm, setRadiusKm] = useState(3);
  const [openNow, setOpenNow] = useState(true);
  const [sort, setSort] = useState<PresenceQuery["sort"]>("nearest");
  const [trip, setTrip] = useState<string[]>(() => listTripIds());

  useEffect(() => onTripChange(() => setTrip(listTripIds())), []);

  const pulse = useMemo(() => pulseStats(origin), [origin]);
  const listings = useMemo(
    () => searchListings(origin, { q, category, radiusKm, openNow, sort, inStock: true, verifiedOnly: false }),
    [origin, q, category, radiusKm, openNow, sort]
  );
  const compare = compareCopy();

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="px-4 py-5 sm:px-6">
        <section className="presence-card overflow-hidden rounded-[32px] p-5 sm:p-7">
          <p className="text-[11px] font-black tracking-[0.22em] text-[#0e6f63]">IN-PERSON COMMERCE OS</p>
          <h1 className="mt-2 max-w-xl text-3xl font-black leading-[1.25] tracking-tight sm:text-4xl">
            ببین کی داره.
            <br />
            همین الان حضوری بگیر.
          </h1>
          <p className="mt-3 max-w-lg text-sm font-bold leading-7 text-[#3d433c]">
            دیجی‌کالا منتظر ارسال می‌ماند. دیوار به شانس تکیه می‌کند. کی‌داره موجودی زندهٔ مغازه‌های همین محله را نشان می‌دهد — با دقیقهٔ پیاده، رادار قیمت، و کد برداشت.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              `${toFa(pulse.inWalk15)} کالا تا ۱۵ دقیقه پیاده`,
              `${toFa(pulse.openStores)} فروشگاه باز`,
              `${toFa(pulse.liveUpdates)} به‌روزرسانی زنده`,
            ].map((item) => (
              <span key={item} className="presence-chip rounded-full px-3 py-1.5 text-[11px] font-black">
                {item}
              </span>
            ))}
          </div>
          <label className="mt-5 flex h-14 items-center gap-3 rounded-2xl bg-[#f3efe6] px-4">
            <Sparkles className="h-4 w-4 text-[#0e6f63]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="آیفون، دایسون، دانک پاندا…"
              className="h-full flex-1 bg-transparent text-sm font-bold outline-none"
            />
          </label>
        </section>

        <div className="mt-5 flex gap-2 overflow-x-auto presence-hide-scroll pb-1">
          <button
            type="button"
            onClick={() => setCategory("all")}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${category === "all" ? "bg-[#14161c] text-white" : "presence-chip"}`}
          >
            همه
          </button>
          {(Object.keys(CATEGORY_META) as ListingCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${category === key ? "bg-[#14161c] text-white" : "presence-chip"}`}
            >
              {CATEGORY_META[key].emoji} {CATEGORY_META[key].label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {RADII.map((r) => (
            <button
              key={r.km}
              type="button"
              onClick={() => setRadiusKm(r.km)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black ${radiusKm === r.km ? "bg-[#0e6f63] text-white" : "presence-chip"}`}
            >
              {r.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOpenNow((v) => !v)}
            className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-black ${openNow ? "bg-[#157a4b] text-white" : "presence-chip"}`}
          >
            <Clock3 className="h-3 w-3" /> فقط باز
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as PresenceQuery["sort"])}
            className="presence-chip rounded-full px-3 py-1.5 text-[11px] font-black outline-none"
          >
            <option value="nearest">نزدیک‌ترین</option>
            <option value="cheapest">ارزان‌ترین</option>
            <option value="trust">معتبرترین</option>
            <option value="newest">تازه‌ترین موجودی</option>
          </select>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              inTrip={trip.includes(listing.id)}
              onToggleTrip={(id) => setTrip(toggleTrip(id))}
            />
          ))}
        </div>
        {listings.length === 0 && (
          <p className="py-16 text-center text-sm font-bold text-[#6b7168]">در این شعاع کالای باز و موجود نیست. شعاع را بزرگ‌تر کن.</p>
        )}

        <section className="mt-10 overflow-hidden rounded-[28px] border border-[var(--line)]">
          <div className="bg-[#14161c] px-5 py-4 text-white">
            <p className="text-[11px] font-black tracking-[0.2em] text-[#b68a3a]">WHY NOT DIGIKALA / DIVAR</p>
            <h2 className="mt-1 text-lg font-black">استاندارد سیلیکون‌ولی برای خرید حضوری ایران</h2>
          </div>
          <div className="grid sm:grid-cols-2">
            {compare.map((row) => (
              <div key={row.axis} className="border-t border-[var(--line)] p-4">
                <p className="text-[11px] font-black text-[#6b7168]">{row.axis}</p>
                <p className="mt-2 text-xs font-bold text-[#9aa196]">دیجی‌کالا: {row.digikala}</p>
                <p className="text-xs font-bold text-[#9aa196]">دیوار: {row.divar}</p>
                <p className="mt-1 text-sm font-black text-[#0e6f63]">کی‌داره: {row.kidareh}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="sticky top-[73px] hidden h-[calc(100dvh-73px)] border-r border-[var(--line)] lg:block">
        <div className="relative h-full">
          <PresenceMap origin={origin} listings={listings} />
          <div className="absolute bottom-4 right-4 left-4 presence-card rounded-2xl p-3">
            <p className="inline-flex items-center gap-1 text-xs font-black">
              <Footprints className="h-3.5 w-3.5 text-[#0e6f63]" />
              {toFa(listings.length)} کالا روی نقشهٔ {origin.label}
            </p>
            <div className="mt-2 flex gap-2">
              <Link to="/explore" className="flex-1 rounded-xl bg-[#14161c] py-2 text-center text-[11px] font-black text-white">
                نقشه تمام‌صفحه
              </Link>
              <Link to="/radar" className="flex items-center justify-center gap-1 rounded-xl bg-[#0e6f63] px-3 text-[11px] font-black text-white">
                <Radio className="h-3.5 w-3.5" /> رادار
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
