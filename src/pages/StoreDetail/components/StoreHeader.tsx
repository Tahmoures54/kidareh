import React, { memo } from "react";
import { Store, CheckCircle2, BadgeCheck, Star } from "lucide-react";
import { StoreData } from "../types";
// دیگر نیازی به import fa نیست

interface Props {
  store: StoreData;
  hasBlueTick: boolean;
  followersCount: number;
}

export const StoreHeader = memo(({ store, hasBlueTick, followersCount }: Props) => {
  return (
    <header className="relative bg-gradient-to-br from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white pt-24 pb-16 overflow-hidden px-5 rounded-b-[3rem] shadow-lg shadow-[var(--brand-glow)]">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/15 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar */}
        <div className="relative mb-5">
          <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-[32px] overflow-hidden shadow-2xl border border-white/30 p-1 shrink-0 z-10 relative">
            <div className="w-full h-full rounded-[28px] overflow-hidden bg-white/10 flex items-center justify-center">
              {store.image ? (
                <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-white/80" />
              )}
            </div>
          </div>
          {(store.verified || hasBlueTick) && (
            <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 shadow-md z-20 border-2 border-[var(--brand-primary)]">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-2 text-center">
          <h1 className="text-2xl font-black tracking-tight drop-shadow-md">{store.name}</h1>
        </div>
        
        <p className="text-[11px] font-bold text-white/80 bg-white/15 border border-white/20 backdrop-blur-md px-4 py-1.5 rounded-full mb-6">
          {store.category || "فروشگاه عمومی"}
        </p>

        {/* Stats */}
        <div className="flex w-full max-w-sm px-2 justify-between items-center bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl py-4 shadow-inner">
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {(store.rating ?? 0).toLocaleString("fa-IR")}</span>
            <span className="text-[10px] text-white/70 mt-0.5">{(store.reviews ?? 0).toLocaleString("fa-IR")} نظر</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black">{followersCount.toLocaleString("fa-IR")}</span>
            <span className="text-[10px] text-white/70 mt-0.5">فالوور</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black">{(store.products?.length || 0).toLocaleString("fa-IR")}</span>
            <span className="text-[10px] text-white/70 mt-0.5">محصول</span>
          </div>
        </div>
      </div>
    </header>
  );
});