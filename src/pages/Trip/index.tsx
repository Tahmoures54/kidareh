import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Clock3, Footprints, Loader2, MapPin, Navigation, Phone, Save, Trash2 } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { formatClock } from "../../presence/geo";
import { formatCompactToman, formatWalk, mapsMultiStopUrl, planTrip, toFa } from "../../presence/engine";
import { clearTrip, listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import PresenceMap from "../../components/presence/PresenceMap";
import PageHero from "../../components/presence/PageHero";
import PresenceEmpty from "../../components/presence/EmptyState";

interface SavedTripResponse {
  tripId: string;
  status: "planned";
}

export default function TripPage() {
  const { origin } = usePresenceOrigin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [ids, setIds] = useState(() => listTripIds());
  const [saving, setSaving] = useState(false);
  const [savedTripId, setSavedTripId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [navigationActive, setNavigationActive] = useState(false);
  const [activeStopIndex, setActiveStopIndex] = useState(0);

  useEffect(() => onTripChange(() => setIds(listTripIds())), []);

  const plan = useMemo(() => planTrip(origin, ids), [origin, ids]);
  const path = useMemo(
    () => [{ lat: origin.lat, lng: origin.lng }, ...plan.stops.map((stop) => ({
      lat: stop.listing.store.lat,
      lng: stop.listing.store.lng,
    }))],
    [origin.lat, origin.lng, plan.stops],
  );
  const markerNumbers = useMemo(
    () => Object.fromEntries(plan.stops.map((stop, index) => [stop.listing.id, index + 1])),
    [plan.stops],
  );
  const maps = mapsMultiStopUrl(
    origin,
    plan.stops.map((stop) => ({ lat: stop.listing.store.lat, lng: stop.listing.store.lng })),
  );

  const saveTrip = async () => {
    if (!user) {
      navigate("/login", { state: { returnUrl: "/trip" } });
      return;
    }
    if (plan.stops.length === 0 || saving) return;

    setSaving(true);
    setNotice("");
    try {
      const saved = await apiRequest<SavedTripResponse>("/api/presence/trips", {
        method: "POST",
        auth: true,
        body: {
          lat: origin.lat,
          lng: origin.lng,
          label: origin.label,
          listingIds: ids,
        },
      });
      setSavedTripId(saved.tripId);
      setNotice("مسیر در حساب کاربری شما ذخیره شد.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "ذخیره مسیر انجام نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  };

  const startNavigation = () => {
    if (plan.stops.length === 0) return;
    setActiveStopIndex(0);
    setNavigationActive(true);
    setNotice("");
    if (savedTripId) {
      void apiRequest("/api/presence/trips/" + savedTripId + "/status", {
        method: "PATCH",
        auth: true,
        body: { status: "started" },
      }).catch(() => setNotice("مسیریابی فعال شد؛ وضعیت ذخیره‌شده هنوز به‌روزرسانی نشده است."));
    }
  };

  const advanceNavigation = () => {
    if (activeStopIndex < plan.stops.length - 1) {
      setActiveStopIndex((index) => index + 1);
      return;
    }

    setNavigationActive(false);
    setNotice("آفرین! همه توقف‌های مسیر تمام شد.");
    if (savedTripId) {
      void apiRequest("/api/presence/trips/" + savedTripId + "/status", {
        method: "PATCH",
        auth: true,
        body: { status: "completed" },
      }).catch(() => setNotice("مسیر تمام شد، اما وضعیت ذخیره‌شده به‌روزرسانی نشد."));
    }
  };

  const clearRoute = () => {
    clearTrip();
    setIds([]);
    setSavedTripId(null);
    setNavigationActive(false);
    setActiveStopIndex(0);
    setNotice("");
  };

  const activeStop = plan.stops[activeStopIndex];

  return (
    <div className="grid min-h-[calc(100dvh-73px)] lg:grid-cols-[26rem_minmax(0,1fr)]" dir="rtl">
      <div className="order-1 h-[38vh] min-h-[250px] lg:order-2 lg:sticky lg:top-[73px] lg:h-[calc(100dvh-73px)]">
        <PresenceMap
          origin={origin}
          listings={plan.stops.map((stop) => stop.listing)}
          path={path}
          markerNumbers={markerNumbers}
        />
      </div>

      <div className="order-2 space-y-4 p-4 pb-28 sm:p-5 lg:order-1 lg:pb-8">
        <PageHero kicker="خرید پیاده" title="چند مغازه، یک مسیر">
          کالاها را به مسیر اضافه کن؛ توقف‌ها بر اساس فاصله بهینه می‌شوند و کالاهای یک فروشگاه در یک توقف جمع می‌شوند.
        </PageHero>

        {notice && (
          <p role="status" aria-live="polite" className="rounded-2xl border border-teal-100 bg-teal-50 px-4 py-3 text-xs font-bold leading-6 text-teal-800">
            {notice}
          </p>
        )}

        {navigationActive && activeStop && (
          <section className="rounded-3xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-sm" aria-live="polite">
            <div className="flex items-center gap-2 text-xs font-black text-teal-700">
              <Navigation className="h-4 w-4" />
              توقف {toFa(activeStopIndex + 1)} از {toFa(plan.stops.length)}
            </div>
            <h2 className="mt-2 text-lg font-black text-slate-900">{activeStop.listing.store.name}</h2>
            <p className="mt-1 text-xs leading-6 text-slate-600">{activeStop.listing.store.address}</p>
            <p className="mt-2 text-xs font-bold text-teal-800">از توقف قبل: {formatWalk(activeStop.walkFromPrev)}</p>
            <div className="mt-4 flex gap-2">
              <a
                href={mapsMultiStopUrl(origin, [{ lat: activeStop.listing.store.lat, lng: activeStop.listing.store.lng }])}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-700 px-3 text-xs font-black text-white"
              >
                <Navigation className="h-4 w-4" /> راهنمای مسیر
              </a>
              <button
                type="button"
                onClick={advanceNavigation}
                className="min-h-11 flex-1 rounded-xl border border-teal-200 bg-white px-3 text-xs font-black text-teal-800"
              >
                {activeStopIndex === plan.stops.length - 1 ? "پایان سفر" : "رفتم؛ توقف بعدی"}
              </button>
            </div>
          </section>
        )}

        {plan.stops.length === 0 ? (
          <PresenceEmpty
            title="هنوز کالایی به مسیر اضافه نشده"
            hint="از صفحه محله روی «مسیر» بزن تا چند خرید را در یک برنامه جمع کنی."
            actionTo="/"
            actionLabel="بازگشت به محله"
          />
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="پیاده‌روی" value={formatWalk(plan.totalWalkMinutes)} />
              <Stat label="فروشگاه" value={toFa(plan.stores)} />
              <Stat label="مجموع کالاها" value={formatCompactToman(plan.totalToman)} />
            </div>

            <ol className="space-y-3">
              {plan.stops.map((stop, index) => (
                <li
                  key={stop.listing.storeId}
                  className={[
                    "rounded-3xl border bg-white p-3 shadow-sm transition-colors",
                    navigationActive && index === activeStopIndex ? "border-teal-400 ring-2 ring-teal-100" : "border-slate-100",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#08a6a6] text-sm font-black text-white">
                      {toFa(index + 1)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-black text-slate-900">{stop.listing.store.name}</h2>
                      <p className="mt-1 flex items-start gap-1 text-[11px] leading-5 text-slate-500">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {stop.listing.store.address}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-bold text-teal-700">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatClock(stop.listing.store.openHour)} تا {formatClock(stop.listing.store.closeHour)}
                        <span className="text-slate-400">·</span>
                        {formatWalk(stop.walkFromPrev)} از توقف قبل
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label={"حذف کالاهای فروشگاه " + stop.listing.store.name + " از مسیر"}
                      onClick={() => {
                        stop.listings.forEach((listing) => toggleTrip(listing.id));
                        setIds(listTripIds());
                        setSavedTripId(null);
                        setNavigationActive(false);
                      }}
                      className="rounded-xl p-2 text-rose-500 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    {stop.listings.map((listing) => (
                      <div key={listing.id} className="flex items-start justify-between gap-3">
                        <Link to={"/p/" + listing.id} className="min-w-0 flex-1 text-xs font-bold leading-5 text-slate-700 hover:text-teal-700">
                          {listing.name}
                        </Link>
                        <span className="shrink-0 text-xs font-black text-slate-900">{formatCompactToman(listing.price)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    {stop.listing.store.phone ? (
                      <a href={"tel:" + stop.listing.store.phone} dir="ltr" className="inline-flex items-center gap-1.5 text-[11px] font-black text-teal-700">
                        <Phone className="h-3.5 w-3.5" /> {stop.listing.store.phone}
                      </a>
                    ) : (
                      <span className="text-[11px] font-bold text-slate-400">شماره تماس ثبت نشده</span>
                    )}
                    <span className="text-[11px] font-black text-slate-500">
                      جمع: {formatCompactToman(stop.listings.reduce((sum, listing) => sum + listing.price, 0))}
                    </span>
                  </div>
                </li>
              ))}
            </ol>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={startNavigation}
                disabled={navigationActive}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#08a6a6] px-4 text-sm font-black text-white shadow-lg shadow-teal-700/15 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Navigation className="h-4 w-4" /> شروع سفر درون‌برنامه‌ای
              </button>
              <button
                type="button"
                onClick={saveTrip}
                disabled={saving}
                className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-teal-200 bg-white px-4 text-sm font-black text-teal-800 transition hover:bg-teal-50 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "در حال ذخیره…" : savedTripId ? "مسیر ذخیره شد" : "ذخیره مسیر در حساب"}
              </button>
            </div>

            <a
              href={maps}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700"
            >
              <Navigation className="h-4 w-4" /> باز کردن مسیر کامل در نقشه
            </a>

            <button
              type="button"
              onClick={clearRoute}
              className="w-full rounded-xl py-2 text-center text-xs font-black text-[var(--muted)] transition hover:text-rose-600"
            >
              پاک کردن مسیر
            </button>
          </>
        )}

        <p className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--muted)]">
          <Footprints className="h-3.5 w-3.5" /> مسیر بهینه بر اساس فاصله جغرافیایی است؛ زمان‌ها تخمینی‌اند و ترافیک پیاده را لحاظ نمی‌کنند.
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <p className="text-[10px] font-black text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
