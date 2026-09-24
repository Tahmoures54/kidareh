import React, { memo } from "react";
import { Link } from "react-router-dom";
import { Store, BadgeCheck, Loader2, MapPin, Building2, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  storeId?: number | string | null;
  storeName: string;
  storeCity: string;
  followers: number;
  following: boolean;
  followLoading: boolean;
  hasBlueTick: boolean;
  distance: string | null;
  onFollow: () => void;
  onStoreClick: () => void;
}

export const StoreCard = memo(({ storeId, storeName, storeCity, followers, following, followLoading, hasBlueTick, distance, onFollow }: Props) => {
  const storeHref = storeId ? `/store/${storeId}` : "#";

  return (
    <section className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-3xl p-5 shadow-sm" aria-label="فروشگاه">
      <div className="flex justify-between items-start gap-3 mb-4">
        <Link to={storeHref} onClick={onStoreClick} className="flex items-center gap-3 min-w-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]">
          <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center relative border border-[var(--border-light)] shrink-0">
            <Store className="w-6 h-6 text-[var(--text-muted)]" />
            {hasBlueTick && <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-[var(--bg-secondary)] rounded-full border-2 border-[var(--bg-secondary)]" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-[var(--text-primary)] flex items-center gap-1.5 text-sm truncate">
              {storeName || "فروشگاه نامشخص"}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-0.5">
              {followers.toLocaleString("fa-IR")} دنبال‌کننده
            </p>
          </div>
        </Link>
        <motion.button
          type="button"
          onClick={onFollow}
          disabled={followLoading}
          whileTap={{ scale: 0.96 }}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all shrink-0 ${
            following
              ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-light)]"
              : "bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-glow)]"
          }`}
          aria-pressed={following}
        >
          {followLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" aria-label="در حال پردازش" /> : following ? "دنبال شده" : "دنبال کردن"}
        </motion.button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-4 border-t border-[var(--border-light)] text-xs font-bold text-[var(--text-secondary)]">
        {distance && (
          <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-3 py-2.5 rounded-xl">
            <MapPin className="w-4 h-4 shrink-0 text-[var(--brand-primary)]" />
            <span><strong className="text-[var(--text-primary)]">{distance}</strong> فاصله</span>
          </div>
        )}
        <div className="flex items-center gap-2 bg-[var(--bg-tertiary)] px-3 py-2.5 rounded-xl">
          <Building2 className="w-4 h-4 shrink-0 text-[var(--text-muted)]" />
          <span>{storeCity || "شهر نامشخص"}</span>
        </div>
      </div>

      {storeId && (
        <Link
          to={storeHref}
          onClick={onStoreClick}
          className="mt-3 inline-flex w-full min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--brand-primary)]/25 bg-[var(--brand-primary)]/5 px-4 text-xs font-black text-[var(--brand-primary)] transition hover:bg-[var(--brand-primary)]/10"
        >
          مشاهده فروشگاه و کالاهای دیگر
          <ExternalLink className="w-4 h-4" />
        </Link>
      )}
    </section>
  );
});
