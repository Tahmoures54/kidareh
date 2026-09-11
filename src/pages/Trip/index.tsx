import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Footprints, Navigation, Trash2 } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { formatCompactToman, formatWalk, mapsMultiStopUrl, planTrip, toFa } from "../../presence/engine";
import { clearTrip, listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import PresenceMap from "../../components/presence/PresenceMap";
import PageHero from "../../components/presence/PageHero";
import PresenceEmpty from "../../components/presence/EmptyState";

export default function TripPage() {
  const { origin } = usePresenceOrigin();
  const [ids, setIds] = useState(() => listTripIds());
  useEffect(() => onTripChange(() => setIds(listTripIds())), []);
  const plan = useMemo(() => planTrip(origin, ids), [origin, ids]);
  const path = [{ lat: origin.lat, lng: origin.lng }, ...plan.stops.map((s) => ({ lat: s.listing.store.lat, lng: s.listing.store.lng }))];
  const maps = mapsMultiStopUrl(origin, plan.stops.map((s) => ({ lat: s.listing.store.lat, lng: s.listing.store.lng })));

  return (
    <div className="grid lg:grid-cols-[26rem_minmax(0,1fr)]">
      <div className="order-1 h-[40vh] lg:order-2 lg:h-[calc(100dvh-73px)]">
        <PresenceMap origin={origin} listings={plan.stops.map((s) => s.listing)} path={path} />
      </div>
      <div className="order-2 space-y-4 p-5 lg:order-1">
        <PageHero kicker="خرید پیاده" title="چند مغازه، یک مسیر">
          کالاها را به مسیر اضافه کن. کوتاه‌ترین پیاده‌روی تا همه مغازه‌ها ساخته می‌شود.
        </PageHero>
        {plan.stops.length === 0 ? (
          <PresenceEmpty
            title="هنوز کالایی به مسیر اضافه نشده"
            hint="از صفحه محله روی «مسیر» بزن تا تور پیاده ساخته شود."
            actionTo="/"
            actionLabel="بازگشت به محله"
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="پیاده" value={formatWalk(plan.totalWalkMinutes)} />
              <Stat label="فروشگاه" value={toFa(plan.stores)} />
              <Stat label="سبد" value={formatCompactToman(plan.totalToman)} />
            </div>
            <ol className="space-y-3">
              {plan.stops.map((stop, i) => (
                <li key={stop.listing.id} className="presence-card flex gap-3 rounded-3xl p-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--accent)] text-sm font-black text-white">
                    {toFa(i + 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/p/${stop.listing.id}`} className="line-clamp-2 text-sm font-black">
                      {stop.listing.name}
                    </Link>
                    <p className="mt-1 text-[11px] font-bold text-[var(--muted)]">
                      {stop.listing.store.name} · از توقف قبل {formatWalk(stop.walkFromPrev)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="حذف از مسیر"
                    onClick={() => setIds(toggleTrip(stop.listing.id))}
                    className="text-[var(--danger)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ol>
            <a
              href={maps}
              target="_blank"
              rel="noreferrer"
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-sm font-black text-white"
            >
              <Navigation className="h-4 w-4" /> شروع پیاده‌روی در نقشه
            </a>
            <button
              type="button"
              onClick={() => {
                clearTrip();
                setIds([]);
              }}
              className="w-full text-center text-xs font-black text-[var(--muted)]"
            >
              پاک کردن مسیر
            </button>
          </>
        )}
        <p className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)]">
          <Footprints className="h-3.5 w-3.5" /> مسیر کوتاه برای چند خرید در یک محله
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="presence-card rounded-2xl p-3">
      <p className="text-[10px] font-black text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
