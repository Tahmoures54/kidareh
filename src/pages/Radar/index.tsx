import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, BadgeCheck, Footprints, ChevronDown, TrendingDown } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { useAppLocation } from "../../hooks/useAppLocation";
import { buildRadar, formatCompactToman, formatToman, formatWalk, toFa } from "../../presence/engine";
import PageHero from "../../components/presence/PageHero";
import PresenceImage from "../../components/presence/PresenceImage";
import PresenceEmpty from "../../components/presence/EmptyState";

export default function RadarPage() {
  const { origin } = usePresenceOrigin();
  const { location: cityLocation, isTehran } = useAppLocation();
  const [params] = useSearchParams();
  const sku = params.get("sku") || undefined;
  const groups = useMemo(() => (isTehran ? buildRadar(origin, sku) : []), [isTehran, origin, sku]);
  const [openSku, setOpenSku] = useState(sku ?? groups[0]?.sku);

  return (
    <div className="px-4 py-5 sm:px-6" dir="rtl">
      <PageHero kicker="مقایسه قیمت" title="کجا ارزان‌تر است؟">
        همان کالا در چند مغازه. ارزان‌ترین را ببین و پیاده برو.
      </PageHero>

      <div className="space-y-4">
        {groups.map((group, gi) => {
          const open = openSku === group.sku;
          return (
            <motion.section
              key={group.sku}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.06 }}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => setOpenSku(open ? "" : group.sku)}
                className="flex w-full items-start justify-between gap-3 p-5 text-right transition hover:bg-slate-50/50"
              >
                <div className="min-w-0">
                  <h2 className="text-lg font-black text-slate-900">{group.label}</h2>
                  <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
                    <span>{toFa(group.storeCount)} فروشگاه</span>
                    <span className="h-1 w-1 rounded-full bg-slate-300" />
                    <span className="inline-flex items-center gap-1 text-amber-600">
                      <TrendingDown className="h-3 w-3" />
                      اختلاف {formatCompactToman(group.spreadToman)}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-3">
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-slate-400">ارزان‌ترین</p>
                    <p className="text-base font-black text-cyan-600">{formatCompactToman(group.cheapest.price)}</p>
                    <p className="text-[11px] font-bold text-slate-500">{formatWalk(group.cheapest.walkMinutes)}</p>
                    {group.cheapest.price > 0 && (
                      <div className="mt-2 h-1.5 w-24 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-cyan-500 to-teal-400"
                          style={{
                            width: `${Math.min(100, Math.round((group.spreadToman / group.cheapest.price) * 100))}%`,
                          }}
                        />
                      </div>
                    )}
                  </div>
                  <ChevronDown
                    className={`mt-1 h-5 w-5 text-slate-300 transition-transform duration-300 ${open ? "rotate-180 text-cyan-500" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden border-t border-slate-100"
                  >
                    {group.listings.map((item, index) => {
                      const extra = item.price - group.cheapest.price;
                      return (
                        <Link
                          key={item.id}
                          to={`/p/${item.id}`}
                          className="group flex items-center gap-3 border-b border-slate-50 px-5 py-3.5 last:border-0 transition hover:bg-cyan-50/40"
                        >
                          <PresenceImage
                            src={item.image}
                            className="h-14 w-14 rounded-2xl object-cover shadow-sm ring-1 ring-slate-100"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-800 group-hover:text-cyan-700">
                              {item.store.name}
                            </p>
                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold text-slate-400">
                              <span className="inline-flex items-center gap-1">
                                <Footprints className="h-3 w-3" />
                                {formatWalk(item.walkMinutes)}
                              </span>
                              {item.store.verified && (
                                <span className="inline-flex items-center gap-0.5 text-cyan-600">
                                  <BadgeCheck className="h-3 w-3" /> تأیید
                                </span>
                              )}
                              {index === 0 && (
                                <span className="rounded-full bg-gradient-to-l from-cyan-600 to-teal-500 px-2 py-0.5 text-[10px] text-white">
                                  بهترین قیمت
                                </span>
                              )}
                              {item.id === group.nearest.id && (
                                <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] text-white">
                                  نزدیک‌ترین
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-black text-slate-800">{formatToman(item.price)}</p>
                            {extra > 0 ? (
                              <p className="text-[11px] font-bold text-rose-500">+{formatCompactToman(extra)}</p>
                            ) : (
                              <p className="text-[11px] font-bold text-emerald-600">کمینه محله</p>
                            )}
                          </div>
                          <ArrowLeft className="h-4 w-4 text-slate-300 transition group-hover:text-cyan-500" />
                        </Link>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}

        {groups.length === 0 && (
          <PresenceEmpty
            title={isTehran ? "برای این کالا هنوز چند فروشگاه در رادار نیست" : `رادار قیمت فعلاً برای محله‌های تهران است`}
            hint={isTehran ? undefined : `کالاهای ${cityLocation.city} را از جستجو مقایسه کن.`}
            actionTo="/"
            actionLabel="بازگشت به خانه"
          />
        )}
      </div>
    </div>
  );
}
