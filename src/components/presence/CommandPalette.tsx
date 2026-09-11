import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Command, Footprints, Radio, Search, Store } from "lucide-react";
import { searchListings } from "../../presence/engine";
import type { PresenceOrigin } from "../../presence/types";
import { formatCompactToman, formatWalk } from "../../presence/engine";

interface Props {
  open: boolean;
  onClose: () => void;
  origin: PresenceOrigin;
}

export default function CommandPalette({ open, onClose, origin }: Props) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const results = useMemo(() => searchListings(origin, { q, inStock: true }).slice(0, 8), [origin, q]);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" className="absolute inset-0 bg-[#14161c]/45 backdrop-blur-md" aria-label="بستن جستجو" onClick={onClose} />
          <motion.div
            role="dialog"
            aria-label="جستجوی فرمان"
            initial={{ y: 16, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0 }}
            className="presence-card relative z-10 w-full max-w-xl overflow-hidden rounded-[28px]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-3">
              <Search className="h-4 w-4 text-[#6b7168]" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="چی می‌خوای؟ آیفون، دایسون، دانک…"
                className="h-10 flex-1 bg-transparent text-sm font-bold outline-none placeholder:text-[#9aa196]"
              />
              <kbd className="hidden rounded-lg border border-[var(--line)] px-2 py-1 text-[10px] font-black text-[#6b7168] sm:inline-flex">ESC</kbd>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm font-bold text-[#6b7168]">چیزی در این محله پیدا نشد</p>
              ) : (
                results.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(`/p/${item.id}`)}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-right hover:bg-[#f3efe6]"
                  >
                    <img src={item.image} alt="" className="h-12 w-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{item.name}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-[11px] font-bold text-[#6b7168]">
                        <Store className="h-3 w-3" /> {item.store.name}
                        <Footprints className="h-3 w-3" /> {formatWalk(item.walkMinutes)}
                      </p>
                    </div>
                    <span className="text-xs font-black">{formatCompactToman(item.price)}</span>
                  </button>
                ))
              )}
              <button
                type="button"
                onClick={() => go(q ? `/explore?q=${encodeURIComponent(q)}` : "/radar")}
                className="mt-1 flex w-full items-center gap-2 rounded-2xl px-3 py-3 text-xs font-black text-[#0e6f63] hover:bg-[#f3efe6]"
              >
                <Radio className="h-4 w-4" /> باز کردن رادار قیمت برای همین جستجو
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-2 text-[10px] font-bold text-[#9aa196]">
              <span className="inline-flex items-center gap-1">
                <Command className="h-3 w-3" />K برای جستجو
              </span>
              <span>موجودی زنده محله — نه انبار مرکزی</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
