import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock3, QrCode, X } from "lucide-react";
import QRCode from "qrcode";
import type { EnrichedListing, HoldRecord } from "../../presence/types";
import { HOLD_OPTIONS, addLocalHold } from "../../presence/holds";
import { formatToman, formatWalk } from "../../presence/engine";
import { apiRequest } from "../../utils/api";
import { useAuth } from "../../context/AuthContext";

interface Props {
  listing: EnrichedListing | null;
  open: boolean;
  onClose: () => void;
  onCreated?: (hold: HoldRecord) => void;
}

export default function HoldSheet({ listing, open, onClose, onCreated }: Props) {
  const { isAuthenticated } = useAuth();
  const [minutes, setMinutes] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<HoldRecord | null>(null);
  const [qr, setQr] = useState("");

  const remainingLabel = useMemo(() => {
    if (!listing?.closesInMinutes) return null;
    if (listing.closesInMinutes < minutes) return `فروشگاه تا ${listing.closesInMinutes} دقیقه دیگر باز است`;
    return null;
  }, [listing, minutes]);

  const submit = async () => {
    if (!listing) return;
    setBusy(true);
    setError("");
    try {
      let hold = addLocalHold(listing.id, minutes);
      if (isAuthenticated) {
        try {
          const data = await apiRequest<{ reservation: HoldRecord }>("/api/reservations", {
            method: "POST",
            auth: true,
            body: { listingId: listing.id, holdMinutes: minutes },
          });
          if (data?.reservation) hold = { ...hold, ...data.reservation, guest: false };
        } catch {
          /* local hold still valid */
        }
      }
      const dataUrl = await QRCode.toDataURL(`kidareh:pickup:${hold.pickupCode}`, {
        margin: 1,
        width: 280,
        color: { dark: "#14161c", light: "#00000000" },
      });
      setQr(dataUrl);
      setCreated(hold);
      onCreated?.(hold);
    } catch (e: any) {
      setError(e?.message || "رزرو انجام نشد");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setCreated(null);
    setQr("");
    setError("");
    onClose();
  };

  return (
    <AnimatePresence>
      {open && listing && (
        <>
          <motion.button
            type="button"
            aria-label="بستن"
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="رزرو و برداشت حضوری"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="presence-card fixed inset-x-0 bottom-0 z-[81] mx-auto max-w-lg rounded-t-[32px] p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10" />
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black tracking-wide text-[#0e6f63]">RESERVE & COLLECT</p>
                <h2 className="mt-1 text-lg font-black">{created ? "کالا برای تو نگه داشته شد" : "بدون پرداخت، نگه دار"}</h2>
                <p className="mt-1 text-xs font-bold text-[#6b7168]">
                  {listing.store.name} · {formatWalk(listing.walkMinutes)}
                </p>
              </div>
              <button type="button" onClick={close} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/5" aria-label="بستن">
                <X className="h-4 w-4" />
              </button>
            </div>

            {created ? (
              <div className="text-center">
                {qr && <img src={qr} alt="کد تحویل" className="mx-auto h-40 w-40" />}
                <p className="mt-3 font-mono text-3xl font-black tracking-[0.35em] text-[#14161c]">{created.pickupCode}</p>
                <p className="mt-2 text-xs font-bold text-[#6b7168]">این کد را در فروشگاه نشان بده. تا {new Date(created.expiresAt).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" })} معتبر است.</p>
                <div className="mt-4 rounded-2xl bg-[#f3efe6] p-3 text-right text-xs font-bold leading-6 text-[#3d433c]">
                  برخلاف دیجی‌کالا پرداخت نمی‌کنی تا کالا را ببینی. برخلاف دیوار، فروشگاه متعهد است کالا را نگه دارد.
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm font-black">{listing.name}</p>
                <p className="mt-1 text-sm font-bold text-[#0e6f63]">{formatToman(listing.price)}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {HOLD_OPTIONS.map((opt) => (
                    <button
                      key={opt.minutes}
                      type="button"
                      onClick={() => setMinutes(opt.minutes)}
                      className={`rounded-2xl border px-2 py-3 text-center ${minutes === opt.minutes ? "border-[#0e6f63] bg-[#0e6f63] text-white" : "border-[var(--line)] bg-white"}`}
                    >
                      <span className="block text-sm font-black">{opt.label}</span>
                      <span className="mt-1 block text-[10px] font-bold opacity-80">{opt.hint}</span>
                    </button>
                  ))}
                </div>
                {remainingLabel && (
                  <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-[#b68a3a]">
                    <Clock3 className="h-3.5 w-3.5" /> {remainingLabel}
                  </p>
                )}
                {error && <p className="mt-3 text-xs font-bold text-[#b42318]">{error}</p>}
                <button
                  type="button"
                  disabled={busy || !listing.openNow}
                  onClick={submit}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#14161c] text-sm font-black text-white disabled:opacity-40"
                >
                  {listing.openNow ? (
                    <>
                      <QrCode className="h-4 w-4" />
                      {busy ? "در حال رزرو…" : "رزرو و ساخت کد تحویل"}
                    </>
                  ) : (
                    "فروشگاه الان باز نیست"
                  )}
                </button>
                <p className="mt-3 flex items-center justify-center gap-1 text-[11px] font-bold text-[#6b7168]">
                  <Check className="h-3.5 w-3.5 text-[#157a4b]" />
                  تا دیدن کالا هیچ پولی کم نمی‌شود
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
