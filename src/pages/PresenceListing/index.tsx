import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BadgeCheck,
  Clock3,
  Footprints,
  MessageCircle,
  Navigation,
  Radio,
  ShieldCheck,
  ArrowRight,
  Plus,
  Minus,
  MapPin,
  Sparkles,
} from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import {
  buildRadar,
  enrichListing,
  formatToman,
  formatWalk,
  getListing,
  mapsWalkUrl,
  toFa,
} from "../../presence/engine";
import HoldSheet from "../../components/presence/HoldSheet";
import PresenceMap from "../../components/presence/PresenceMap";
import PresenceImage from "../../components/presence/PresenceImage";
import { listTripIds, onTripChange, toggleTrip } from "../../presence/tripBasket";
import { CATEGORY_META } from "../../presence/catalog";
import { useMinWidth } from "../../hooks/useMinWidth";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export default function PresenceListingPage() {
  const { id = "" } = useParams();
  const { origin } = usePresenceOrigin();
  const raw = getListing(id);
  const listing = raw ? enrichListing(raw, origin) : null;
  const radar = listing ? buildRadar(origin, listing.sku)[0] : null;
  const [holdOpen, setHoldOpen] = useState(false);
  const [inTrip, setInTrip] = useState(() => listTripIds().includes(id));
  const [img, setImg] = useState(0);
  const desktop = useMinWidth(1024);

  useEffect(() => onTripChange(() => setInTrip(listTripIds().includes(id))), [id]);
  useEffect(() => {
    setImg(0);
    setInTrip(listTripIds().includes(id));
  }, [id]);

  const maps = useMemo(
    () => (listing ? mapsWalkUrl(origin, { lat: listing.store.lat, lng: listing.store.lng }) : "#"),
    [listing, origin]
  );

  if (!listing) {
    if (/^\d+$/.test(id)) return <Navigate to={`/products/${id}`} replace />;
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 py-20 text-center" dir="rtl">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
          <Sparkles className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black text-slate-800">این کالا در ویترین محله نیست</h1>
        <p className="mt-2 text-sm font-bold text-slate-400">ممکن است حذف شده یا جابه‌جا شده باشد.</p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-cyan-500/25"
        >
          <ArrowRight className="h-4 w-4" />
          بازگشت به محله
        </Link>
      </div>
    );
  }

  const cat = CATEGORY_META[listing.category];
  const gallery = listing.images.length ? listing.images : [listing.image];
  const savings =
    listing.oldPrice && listing.oldPrice > listing.price
      ? Math.round(((listing.oldPrice - listing.price) / listing.oldPrice) * 100)
      : 0;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_400px]" dir="rtl">
      <div className="px-4 py-5 pb-32 sm:px-6 lg:pb-8">
        {/* Gallery */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-slate-100 shadow-sm"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={img}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <PresenceImage
                src={gallery[img] ?? listing.image}
                alt={listing.name}
                className="aspect-[4/3] w-full object-cover"
              />
            </motion.div>
          </AnimatePresence>

          {/* Overlay badges */}
          <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
            {listing.openNow ? (
              <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                الان باز
              </span>
            ) : (
              <span className="rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-black text-white backdrop-blur">
                بسته
              </span>
            )}
            {savings > 0 && (
              <span className="rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                {toFa(savings)}٪ تخفیف
              </span>
            )}
          </div>

          {gallery.length > 1 && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setImg(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === img ? "w-5 bg-white" : "w-1.5 bg-white/50"
                  }`}
                  aria-label={`تصویر ${i + 1}`}
                />
              ))}
            </div>
          )}
        </motion.div>

        {/* Thumbnails */}
        {gallery.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {gallery.map((src, i) => (
              <button
                key={src + i}
                type="button"
                onClick={() => setImg(i)}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-2xl border-2 transition ${
                  i === img
                    ? "border-cyan-500 shadow-md shadow-cyan-500/20"
                    : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <PresenceImage src={src} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Chips */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-5 flex flex-wrap gap-2"
        >
          <span className="rounded-full border border-cyan-100 bg-cyan-50 px-3 py-1.5 text-[11px] font-black text-cyan-700">
            {cat.emoji} {cat.label}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
            {listing.condition === "new"
              ? "نو"
              : listing.condition === "open-box"
                ? "جعبه باز"
                : "در حد نو"}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
            {listing.stockLabel}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600">
            <Clock3 className="h-3 w-3" /> {listing.freshnessLabel}
          </span>
        </motion.div>

        {/* Title & Price */}
        <motion.div custom={1} variants={fadeUp} initial="hidden" animate="show">
          <h1 className="mt-4 text-2xl font-black leading-snug tracking-tight text-slate-900 sm:text-3xl">
            {listing.name}
          </h1>
          <div className="mt-3 flex items-end gap-3">
            <p className="text-2xl font-black tracking-tight text-cyan-600 sm:text-3xl">
              {formatToman(listing.price)}
            </p>
            {listing.oldPrice ? (
              <p className="mb-1 text-sm font-bold text-slate-400 line-through">
                {formatToman(listing.oldPrice)}
              </p>
            ) : null}
          </div>
        </motion.div>

        {/* Description */}
        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-4 text-sm font-bold leading-8 text-slate-500"
        >
          {listing.description}
        </motion.p>

        {/* Specs */}
        {listing.specs.length > 0 && (
          <motion.ul
            custom={3}
            variants={fadeUp}
            initial="hidden"
            animate="show"
            className="mt-4 flex flex-wrap gap-2"
          >
            {listing.specs.map((s) => (
              <li
                key={s}
                className="rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 px-3.5 py-1.5 text-[12px] font-black text-white shadow-sm shadow-cyan-500/20"
              >
                {s}
              </li>
            ))}
          </motion.ul>
        )}

        {/* Store Card */}
        <motion.section
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-6 overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm"
        >
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-black text-slate-900">{listing.store.name}</p>
                <p className="mt-1 flex items-start gap-1.5 text-xs font-bold leading-6 text-slate-400">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-500" />
                  {listing.store.address}
                </p>
                <p className="mt-2.5 inline-flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Footprints className="h-4 w-4 text-cyan-600" />
                  {formatWalk(listing.walkMinutes)} از {origin.label}
                </p>
              </div>
              {listing.store.verified && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                  <BadgeCheck className="h-3.5 w-3.5" /> {toFa(listing.store.trustScore)} اعتماد
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
              <div
                className={`rounded-2xl p-3 ${
                  listing.openNow
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-50 text-slate-500"
                }`}
              >
                {listing.openNow ? "الان باز" : "بسته"}
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">
                پاسخ {toFa(listing.store.responseMins)} دقیقه
              </div>
              <div className="rounded-2xl bg-slate-50 p-3 text-slate-600">{listing.warranty}</div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 border-t border-slate-100 bg-gradient-to-l from-cyan-600 to-teal-600 px-5 py-3.5 text-xs font-bold leading-6 text-white">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            کالا را در مغازه می‌بینی و روشن می‌کنی، بعد پول می‌دهی. پست در کار نیست.
          </div>
        </motion.section>

        {/* Radar link */}
        {radar && radar.storeCount > 1 && (
          <motion.div custom={5} variants={fadeUp} initial="hidden" animate="show">
            <Link
              to={`/radar?sku=${listing.sku}`}
              className="mt-4 flex items-center justify-between rounded-2xl border border-cyan-100 bg-cyan-50/80 p-4 transition hover:border-cyan-200 hover:bg-cyan-50"
            >
              <div>
                <p className="inline-flex items-center gap-1.5 text-sm font-black text-slate-800">
                  <Radio className="h-4 w-4 text-cyan-600" /> رادار این کالا
                </p>
                <p className="mt-1 text-xs font-bold text-slate-400">
                  {toFa(radar.storeCount)} فروشگاه · اختلاف {formatToman(radar.spreadToman)}
                </p>
              </div>
              <span className="rounded-xl bg-white px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm">
                مقایسه
              </span>
            </Link>
          </motion.div>
        )}

        {/* Desktop actions */}
        <div className="mt-6 hidden flex-col gap-2 sm:flex-row lg:flex">
          <button
            type="button"
            onClick={() => setHoldOpen(true)}
            className="h-12 flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-95"
          >
            رزرو و برداشت حضوری
          </button>
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-sky-500 text-sm font-black text-white shadow-md transition hover:bg-sky-600"
          >
            <Navigation className="h-4 w-4" /> مسیر پیاده
          </a>
          <Link
            to="/messages"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700"
          >
            <MessageCircle className="h-4 w-4" /> چت
          </Link>
        </div>
        <button
          type="button"
          onClick={() => setInTrip(toggleTrip(listing.id).includes(listing.id))}
          className="mt-3 hidden w-full items-center justify-center gap-1.5 text-center text-xs font-black text-slate-400 transition hover:text-cyan-600 lg:flex"
        >
          {inTrip ? (
            <>
              <Minus className="h-3.5 w-3.5" /> از مسیر خرید حذف کن
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" /> افزودن به مسیر چندتوقفی
            </>
          )}
        </button>
      </div>

      {/* Desktop map */}
      {desktop && (
        <aside className="sticky top-[73px] h-[calc(100dvh-73px)] overflow-hidden border-r border-slate-100">
          <PresenceMap origin={origin} listings={[listing]} selectedId={listing.id} />
        </aside>
      )}

      {/* Mobile sticky CTA */}
      <div className="fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 border-t border-slate-200/80 bg-white/95 p-3 shadow-[0_-8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex max-w-lg gap-2">
          <button
            type="button"
            onClick={() => setHoldOpen(true)}
            className="h-12 flex-1 rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 text-sm font-black text-white shadow-lg shadow-cyan-500/25"
          >
            رزرو حضوری
          </button>
          <a
            href={maps}
            target="_blank"
            rel="noreferrer"
            className="flex h-12 items-center justify-center rounded-xl bg-sky-500 px-4 text-white shadow-md"
            aria-label="مسیر پیاده"
          >
            <Navigation className="h-4 w-4" />
          </a>
          <button
            type="button"
            onClick={() => setInTrip(toggleTrip(listing.id).includes(listing.id))}
            className={`flex h-12 items-center justify-center gap-1 rounded-xl border px-3.5 text-xs font-black transition ${
              inTrip
                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            {inTrip ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {inTrip ? "حذف" : "مسیر"}
          </button>
        </div>
      </div>

      <HoldSheet listing={listing} open={holdOpen} onClose={() => setHoldOpen(false)} />
    </div>
  );
}
