import React, { memo } from "react";
import { Store, BadgeCheck, Loader2, MapPin, Building2 } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  storeName: string;
  storeCity: string;
  followers: number;
  following: boolean;
  followLoading: boolean;
  hasBlueTick: boolean;
  distance: string | null;
  onFollow: () => void;
}

export const StoreCard = memo(({ storeName, storeCity, followers, following, followLoading, hasBlueTick, distance, onFollow }: Props) => {
  return (
    <div className="bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-3xl p-5 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center relative border border-[var(--border-light)]">
            <Store className="w-6 h-6 text-[var(--text-muted)]" />
            {hasBlueTick && <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-[var(--bg-secondary)] rounded-full border-2 border-[var(--bg-secondary)]" />}
          </div>
          <div>
            <h3 className="font-black text-[var(--text-primary)] flex items-center gap-1.5 text-sm">
              {storeName || "فروشگاه نامشخص"}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] font-bold mt-0.5">{followers.toLocaleString("fa-IR")} دنبال‌کننده</p>
          </div>
        </div>
        <motion.button 
          onClick={onFollow} 
          disabled={followLoading} 
          whileTap={{ scale: 0.9 }}
          className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
            following 
              ? "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-light)]" 
              : "bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white shadow-md shadow-[var(--brand-glow)]"
          }`}
        >
          {followLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : following ? "دنبال شده" : "دنبال کردن"}
        </motion.button>
      </div>
      
      <div className="pt-4 border-t border-[var(--border-light)] flex items-center gap-3 text-xs font-bold text-[var(--text-secondary)] flex-wrap">
        {distance && (
          <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg"><MapPin className="w-3.5 h-3.5 text-[var(--brand-primary)]" /> {distance} فاصله</div>
        )}
        <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] px-3 py-1.5 rounded-lg"><Building2 className="w-3.5 h-3.5 text-[var(--text-muted)]" /> {storeCity || "شهر نامشخص"}</div>
      </div>
    </div>
  );
});