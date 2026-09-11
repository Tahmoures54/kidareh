import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Footprints, Navigation, Trash2 } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { formatCompactToman, formatWalk, mapsMultiStopUrl, planTrip, toFa } from "../../presence/engine";
import { clearTrip, listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import PresenceMap from "../../components/presence/PresenceMap";

export default function TripPage() {
  const { origin } = usePresenceOrigin();
  const [ids, setIds] = useState(() => listTripIds());
  useEffect(() => onTripChange(() => setIds(listTripIds())), []);
  const plan = useMemo(() => planTrip(origin, ids), [origin, ids]);
  const path = [{ lat: origin.lat, lng: origin.lng }, ...plan.stops.map((s) => ({ lat: s.listing.store.lat, lng: s.listing.store.lng }))];
  const maps = mapsMultiStopUrl(origin, plan.stops.map((s) => ({ lat: s.listing.store.lat, lng: s.listing.store.lng })));

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="h-[40vh] lg:h-[calc(100dvh-73px)]">
        <PresenceMap origin={origin} listings={plan.stops.map((s) => s.listing)} path={path} />
      </div>
      <div className="space-y-4 p-5">
        <p className="text-[11px] font-black tracking-[0.2em] text-[#0e6f63]">WALKING ERRAND</p>
        <h1 className="text-3xl font-black">مسیر خرید حضوری</h1>
        <p className="text-sm font-bold leading-7 text-[#3d433c]">
          چند فروشگاه، یک پیاده‌روی بهینه. کالاها را از محله بردار، مسیر کوتاه‌ترین تور را بگیر، برو و ببین.
        </p>
        {plan.stops.length === 0 ? (
          <div className="presence-card rounded-[28px] p-6 text-sm font-bold text-[#6b7168]">
            هنوز کالایی به مسیر اضافه نشده. از صفحه محله روی «مسیر» بزن.
            <Link to="/" className="mt-3 block font-black text-[#0e6f63]">بازگشت به محله</Link>
          </div>
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#14161c] text-sm font-black text-white">
                    {toFa(i + 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link to={`/p/${stop.listing.id}`} className="line-clamp-2 text-sm font-black">
                      {stop.listing.name}
                    </Link>
                    <p className="mt-1 text-[11px] font-bold text-[#6b7168]">
                      {stop.listing.store.name} · از توقف قبل {formatWalk(stop.walkFromPrev)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="حذف از مسیر"
                    onClick={() => setIds(toggleTrip(stop.listing.id))}
                    className="text-[#b42318]"
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
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#0e6f63] text-sm font-black text-white"
            >
              <Navigation className="h-4 w-4" /> شروع پیاده‌روی در نقشه
            </a>
            <button
              type="button"
              onClick={() => {
                clearTrip();
                setIds([]);
              }}
              className="w-full text-center text-xs font-black text-[#6b7168]"
            >
              پاک کردن مسیر
            </button>
          </>
        )}
        <p className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6b7168]">
          <Footprints className="h-3.5 w-3.5" /> الگوریتم نزدیک‌ترین همسایه — مناسب تور ۲ تا ۸ توقف محله
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="presence-card rounded-2xl p-3">
      <p className="text-[10px] font-black text-[#6b7168]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
