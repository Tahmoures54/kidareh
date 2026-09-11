import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Compass, Footprints, Map as MapIcon, Radio, Search, Store } from "lucide-react";
import { formatCompactToman, formatWalk, searchListings } from "../../presence/engine";
import type { PresenceOrigin } from "../../presence/types";
import PresenceImage from "./PresenceImage";
import { cn } from "../../utils";

interface Props {
  open: boolean;
  onClose: () => void;
  origin: PresenceOrigin;
}

export default function CommandPalette({ open, onClose, origin }: Props) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => searchListings(origin, { q, inStock: true }).slice(0, 8), [origin, q]);

  useEffect(() => {
    if (!open) return undefined;
    setQ("");
    setActive(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => setActive(0), [q]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) go(`/p/${results[active].id}`);
      else if (q) go(`/explore?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-[var(--ink)]/45 backdrop-blur-md" aria-label="بستن جستجو" onClick={onClose} />
          <motion.div
            role="dialog"
                aria-label="جستجو در محله"
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="presence-card relative z-10 w-full max-w-xl overflow-hidden rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--muted)]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="چی می‌خوای؟ آیفون، دایسون، دانک…"
                className="h-10 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[var(--muted)]"
                aria-autocomplete="list"
              />
              <kbd className="hidden rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-black text-[var(--muted)] sm:inline-flex">بستن</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm font-bold text-[var(--muted)]">چیزی در این محله پیدا نشد</p>
              ) : (
                results.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => go(`/p/${item.id}`)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-right",
                      index === active ? "bg-[var(--paper)]" : "hover:bg-[var(--paper)]"
                    )}
                  >
                    <PresenceImage src={item.image} className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{item.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-[var(--muted)]">
                        <Store className="h-3 w-3" /> {item.store.name}
                        <Footprints className="h-3 w-3" /> {formatWalk(item.walkMinutes)}
                      </p>
                    </div>
                    <span className="text-xs font-black">{formatCompactToman(item.price)}</span>
                  </button>
                ))
              )}
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={() => go(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore")}
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black text-[var(--accent)] hover:bg-[var(--paper)]"
                >
                  <MapIcon className="h-4 w-4" /> نقشه زنده
                </button>
                <button
                  type="button"
                  onClick={() => go("/radar")}
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black text-[var(--accent)] hover:bg-[var(--paper)]"
                >
                  <Radio className="h-4 w-4" /> رادار قیمت
                </button>
                <button
                  type="button"
                  onClick={() => go(q ? `/search?q=${encodeURIComponent(q)}` : "/stores")}
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black text-[var(--accent)] hover:bg-[var(--paper)]"
                >
                  <Store className="h-4 w-4" /> فروشگاه‌ها
                </button>
                <button
                  type="button"
                  onClick={() => go("/following")}
                  className="flex items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black text-[var(--accent)] hover:bg-[var(--paper)]"
                >
                  <Compass className="h-4 w-4" /> دنبال‌شده‌ها
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2 text-[11px] font-bold text-[var(--muted)]">
              <span>جستجو در محله</span>
              <span className="inline-flex items-center gap-1">
                <Compass className="h-3 w-3" /> موجودی زنده
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
