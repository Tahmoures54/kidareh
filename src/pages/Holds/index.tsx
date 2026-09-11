import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock3 } from "lucide-react";
import QRCode from "qrcode";
import { cancelLocalHold, listLocalHolds, onHoldsChange } from "../../presence/holds";
import { formatToman } from "../../presence/engine";
import type { HoldRecord } from "../../presence/types";
import PageHero from "../../components/presence/PageHero";
import PresenceImage from "../../components/presence/PresenceImage";
import PresenceEmpty from "../../components/presence/EmptyState";

const labels: Record<HoldRecord["status"], string> = {
  requested: "منتظر تأیید",
  seller_confirmed: "تأیید فروشنده",
  ready_for_pickup: "آماده تحویل",
  completed: "تحویل شد",
  cancelled: "لغو",
  expired: "منقضی",
};

export default function HoldsPage() {
  const [items, setItems] = useState(() => listLocalHolds());
  const [qr, setQr] = useState<Record<string, string>>({});
  const live = useMemo(
    () => items.filter((h) => !["cancelled", "expired", "completed"].includes(h.status)),
    [items]
  );
  const past = useMemo(
    () => items.filter((h) => ["cancelled", "expired", "completed"].includes(h.status)),
    [items]
  );

  useEffect(() => onHoldsChange(() => setItems(listLocalHolds())), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const h of live) {
        next[h.id] = await QRCode.toDataURL(`kidareh:pickup:${h.pickupCode}`, {
          margin: 1,
          width: 200,
          color: { dark: "#14161c", light: "#0000" },
        });
      }
      if (!cancelled) setQr(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [live]);

  return (
    <div className="presence-page px-4 py-6">
      <PageHero kicker="RESERVE & COLLECT" title="رزروهای حضوری">
        کالا را نگه می‌دارند، تو پیاده می‌رسی، با QR تحویل می‌گیری. هیچ پولی تا دیدن کالا کم نمی‌شود.
      </PageHero>
      <div className="mt-6 space-y-4">
        {live.length === 0 && (
          <PresenceEmpty title="رزرو فعالی نداری" hint="از محله یک کالا رزرو کن و با کد تحویل حضوری بردار." actionTo="/" actionLabel="از محله رزرو کن" />
        )}
        {live.map((h) => (
          <article key={h.id} className="presence-card rounded-[28px] p-5">
            <div className="flex gap-3">
              <PresenceImage src={h.image} className="h-20 w-20 rounded-2xl object-cover" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-black">{h.productName}</p>
                <p className="text-[11px] font-bold text-[var(--muted)]">{h.storeName} · {h.neighborhood}</p>
                <p className="mt-1 text-sm font-black text-[var(--accent)]">{formatToman(h.price)}</p>
              </div>
              <span className="h-fit rounded-full bg-[var(--paper)] px-2 py-1 text-[10px] font-black">{labels[h.status]}</span>
            </div>
            <div className="mt-4 flex items-center gap-4">
              {qr[h.id] && <img src={qr[h.id]} alt="QR تحویل" className="h-24 w-24" />}
              <div>
                <p className="font-mono text-2xl font-black tracking-[0.3em]">{h.pickupCode}</p>
                <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--muted)]">
                  <Clock3 className="h-3.5 w-3.5" />
                  تا {new Date(h.expiresAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })}
                </p>
                <div className="mt-3 flex gap-2">
                  <Link to={`/p/${h.listingId}`} className="rounded-xl bg-[var(--ink)] px-3 py-2 text-[11px] font-black text-white">کالا</Link>
                  <button
                    type="button"
                    onClick={() => {
                      cancelLocalHold(h.id);
                      setItems(listLocalHolds());
                    }}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-[11px] font-black text-rose-700"
                  >
                    لغو
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>
      {past.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-black text-[var(--muted)]">تاریخچه</h2>
          <ul className="mt-2 space-y-2">
            {past.map((h) => (
              <li key={h.id} className="flex justify-between text-xs font-bold text-[var(--muted)]">
                <span>{h.productName}</span>
                <span>{labels[h.status]}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
