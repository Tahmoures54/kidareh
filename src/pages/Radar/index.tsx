import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Footprints } from "lucide-react";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";
import { buildRadar, formatCompactToman, formatToman, formatWalk, toFa } from "../../presence/engine";

export default function RadarPage() {
  const { origin } = usePresenceOrigin();
  const [params] = useSearchParams();
  const sku = params.get("sku") || undefined;
  const groups = useMemo(() => buildRadar(origin, sku), [origin, sku]);
  const [openSku, setOpenSku] = useState(sku ?? groups[0]?.sku);

  return (
    <div className="px-4 py-5 sm:px-6">
      <p className="text-[11px] font-black tracking-[0.2em] text-[#0e6f63]">PRICE RADAR</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight">رادار قیمت محله</h1>
      <p className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[#3d433c]">
        همان کالا، چند فروشگاه، قیمت زنده. دیجی‌کالا یک انبار دارد؛ دیوار قیمت را پنهان می‌کند. اینجا اختلاف قیمت را متری می‌بینی و پیاده به ارزان‌ترین می‌روی.
      </p>
      <div className="mt-6 space-y-4">
        {groups.map((group) => {
          const open = openSku === group.sku;
          const saveVsFar = group.spreadToman;
          return (
            <section key={group.sku} className="presence-card overflow-hidden rounded-[28px]">
              <button type="button" onClick={() => setOpenSku(open ? "" : group.sku)} className="flex w-full items-start justify-between gap-3 p-5 text-right">
                <div>
                  <h2 className="text-lg font-black">{group.label}</h2>
                  <p className="mt-1 text-xs font-bold text-[#6b7168]">
                    {toFa(group.storeCount)} فروشگاه · اختلاف {formatCompactToman(saveVsFar)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="text-[11px] font-bold text-[#6b7168]">ارزان‌ترین</p>
                  <p className="text-base font-black text-[#0e6f63]">{formatCompactToman(group.cheapest.price)}</p>
                  <p className="text-[11px] font-bold">{formatWalk(group.cheapest.walkMinutes)}</p>
                </div>
              </button>
              {open && (
                <div className="border-t border-[var(--line)]">
                  {group.listings.map((item, index) => {
                    const extra = item.price - group.cheapest.price;
                    return (
                      <Link
                        key={item.id}
                        to={`/p/${item.id}`}
                        className="flex items-center gap-3 border-b border-[var(--line)] px-5 py-3 last:border-0 hover:bg-[#f3efe6]/70"
                      >
                        <img src={item.image} alt="" className="h-14 w-14 rounded-2xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black">{item.store.name}</p>
                          <p className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] font-bold text-[#6b7168]">
                            <span className="inline-flex items-center gap-1">
                              <Footprints className="h-3 w-3" />
                              {formatWalk(item.walkMinutes)}
                            </span>
                            {item.store.verified && (
                              <span className="inline-flex items-center gap-0.5 text-[#0e6f63]">
                                <BadgeCheck className="h-3 w-3" /> تأیید
                              </span>
                            )}
                            {index === 0 && <span className="rounded-full bg-[#0e6f63] px-2 py-0.5 text-white">بهترین قیمت</span>}
                            {item.id === group.nearest.id && <span className="rounded-full bg-[#14161c] px-2 py-0.5 text-white">نزدیک‌ترین</span>}
                          </p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-black">{formatToman(item.price)}</p>
                          {extra > 0 ? (
                            <p className="text-[11px] font-bold text-[#b42318]">+{formatCompactToman(extra)}</p>
                          ) : (
                            <p className="text-[11px] font-bold text-[#157a4b]">کمینه محله</p>
                          )}
                        </div>
                        <ArrowLeft className="h-4 w-4 text-[#c5c1b6]" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
        {groups.length === 0 && <p className="py-16 text-center text-sm font-bold text-[#6b7168]">برای این کالا هنوز چند فروشگاه در رادار نیست.</p>}
      </div>
    </div>
  );
}
