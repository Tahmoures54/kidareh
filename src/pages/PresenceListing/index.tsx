import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { BadgeCheck, Clock3, Footprints, MessageCircle, Navigation, Radio, ShieldCheck } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { buildRadar, enrichListing, formatToman, formatWalk, getListing, mapsWalkUrl, toFa } from "../../presence/engine";
import HoldSheet from "../../components/presence/HoldSheet";
import PresenceMap from "../../components/presence/PresenceMap";
import { listTripIds, toggleTrip } from "../../presence/tripBasket";
import { CATEGORY_META } from "../../presence/catalog";

export default function PresenceListingPage() {
  const { id = "" } = useParams();
  const { origin } = usePresenceOrigin();
  const raw = getListing(id);
  const listing = raw ? enrichListing(raw, origin) : null;
  const radar = listing ? buildRadar(origin, listing.sku)[0] : null;
  const [holdOpen, setHoldOpen] = useState(false);
  const [inTrip, setInTrip] = useState(() => listTripIds().includes(id));

  const maps = useMemo(
    () => (listing ? mapsWalkUrl(origin, { lat: listing.store.lat, lng: listing.store.lng }) : "#"),
    [listing, origin]
  );

  if (!listing) {
    return (
      <div className="px-6 py-20 text-center">
        <h1 className="text-xl font-black">این کالا در ویترین محله نیست</h1>
        <Link to="/" className="mt-3 inline-block font-black text-[#0e6f63]">بازگشت</Link>
      </div>
    );
  }

  const cat = CATEGORY_META[listing.category];

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="px-4 py-5 sm:px-6">
        <div className="overflow-hidden rounded-[32px]">
          <img src={listing.image} alt={listing.name} className="aspect-[4/3] w-full object-cover" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-[11px] font-black">
          <span className="presence-chip rounded-full px-3 py-1">{cat.label}</span>
          <span className="presence-chip rounded-full px-3 py-1">{listing.condition === "new" ? "نو" : listing.condition === "open-box" ? "جعبه باز" : "در حد نو"}</span>
          <span className="presence-chip rounded-full px-3 py-1">{listing.stockLabel}</span>
          <span className="presence-chip inline-flex items-center gap-1 rounded-full px-3 py-1">
            <Clock3 className="h-3 w-3" /> {listing.freshnessLabel}
          </span>
        </div>
        <h1 className="mt-4 text-3xl font-black leading-snug">{listing.name}</h1>
        <p className="mt-2 text-2xl font-black text-[#0e6f63]">{formatToman(listing.price)}</p>
        {listing.oldPrice ? <p className="text-sm font-bold text-[#9aa196] line-through">{formatToman(listing.oldPrice)}</p> : null}
        <p className="mt-4 text-sm font-bold leading-8 text-[#3d433c]">{listing.description}</p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {listing.specs.map((s) => (
            <li key={s} className="rounded-full bg-[#14161c] px-3 py-1 text-[11px] font-black text-white">{s}</li>
          ))}
        </ul>

        <section className="presence-card mt-6 rounded-[28px] p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black">{listing.store.name}</p>
              <p className="text-xs font-bold text-[#6b7168]">{listing.store.address}</p>
              <p className="mt-2 inline-flex items-center gap-2 text-xs font-bold">
                <Footprints className="h-4 w-4 text-[#0e6f63]" />
                {formatWalk(listing.walkMinutes)} از {origin.label}
              </p>
            </div>
            {listing.store.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0e6f63] px-2 py-1 text-[10px] font-black text-white">
                <BadgeCheck className="h-3.5 w-3.5" /> {toFa(listing.store.trustScore)} اعتماد
              </span>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
            <div className="rounded-2xl bg-[#f3efe6] p-3">{listing.openNow ? "الان باز" : "بسته"}</div>
            <div className="rounded-2xl bg-[#f3efe6] p-3">پاسخ {toFa(listing.store.responseMins)} دقیقه</div>
            <div className="rounded-2xl bg-[#f3efe6] p-3">{listing.warranty}</div>
          </div>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-[#14161c] p-3 text-xs font-bold leading-6 text-[#f3efe6]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#b68a3a]" />
            تضمین بازدید: کالا را در ویترین می‌بینی، روشن می‌کنی، بعد پول می‌دهی. این چیزی است که دیجی‌کالا ندارد و دیوار تضمینش نمی‌کند.
          </div>
        </section>

        {radar && radar.storeCount > 1 && (
          <Link to={`/radar?sku=${listing.sku}`} className="presence-card mt-4 flex items-center justify-between rounded-[24px] p-4">
            <div>
              <p className="inline-flex items-center gap-1 text-sm font-black">
                <Radio className="h-4 w-4 text-[#0e6f63]" /> رادار این کالا
              </p>
              <p className="mt-1 text-xs font-bold text-[#6b7168]">
                {toFa(radar.storeCount)} فروشگاه · اختلاف {formatToman(radar.spreadToman)}
              </p>
            </div>
            <span className="text-xs font-black text-[#0e6f63]">مقایسه</span>
          </Link>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setHoldOpen(true)}
            className="h-12 flex-1 rounded-2xl bg-[#0e6f63] text-sm font-black text-white"
          >
            رزرو و برداشت حضوری
          </button>
          <a href={maps} target="_blank" rel="noreferrer" className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#14161c] text-sm font-black text-white">
            <Navigation className="h-4 w-4" /> مسیر پیاده
          </a>
          <Link
            to={`/messages`}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] px-4 text-sm font-black"
          >
            <MessageCircle className="h-4 w-4" /> چت
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setInTrip(toggleTrip(listing.id).includes(listing.id))}
          className="mt-2 w-full text-center text-xs font-black text-[#6b7168]"
        >
          {inTrip ? "از مسیر خرید حذف شد — دوباره بزن برای افزودن" : "افزودن به مسیر چندتوقفی"}
        </button>
      </div>
      <aside className="hidden h-[calc(100dvh-73px)] lg:block">
        <PresenceMap origin={origin} listings={[listing]} selectedId={listing.id} />
      </aside>
      <HoldSheet listing={listing} open={holdOpen} onClose={() => setHoldOpen(false)} />
    </div>
  );
}
