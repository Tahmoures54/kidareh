import React, { memo } from "react";
import { Store, CheckCircle2, BadgeCheck, Star } from "lucide-react";
import { StoreData } from "../types";
import { fa } from "../utils";

interface Props {
  store: StoreData;
  hasBlueTick: boolean;
  followersCount: number;
}

export const StoreHeader = memo(({ store, hasBlueTick, followersCount }: Props) => {
  return (
    <header className="relative bg-gradient-to-b from-indigo-600 to-indigo-900 dark:from-indigo-900 dark:to-slate-900 text-white pt-24 pb-12 overflow-hidden px-4">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center">
        {/* Avatar */}
        <div className="relative mb-5">
          <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-[32px] overflow-hidden shadow-2xl p-1 shrink-0 z-10 relative">
            <div className="w-full h-full rounded-[28px] overflow-hidden bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
              {store.image ? (
                <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
              ) : (
                <Store className="w-10 h-10 text-indigo-300" />
              )}
            </div>
          </div>
          {store.verified && (
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-[3px] shadow-md z-20">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 mb-1 text-center">
          <h1 className="text-2xl font-black tracking-tight">{store.name}</h1>
          {hasBlueTick && <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0" />}
        </div>
        
        <p className="text-[11px] font-bold text-indigo-200 bg-white/10 border border-white/10 backdrop-blur-md px-3 py-1 rounded-full mb-5">
          {store.category || "فروشگاه عمومی"}
        </p>

        {/* Stats */}
        <div className="flex w-full max-w-sm px-6 justify-between items-center bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl py-3.5 shadow-inner">
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400" /> {fa(store.rating)}</span>
            <span className="text-[10px] text-indigo-200 mt-0.5">{fa(store.reviews)} نظر</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black">{followersCount.toLocaleString("fa-IR")}</span>
            <span className="text-[10px] text-indigo-200 mt-0.5">فالوور</span>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="flex flex-col items-center flex-1">
            <span className="text-base font-black">{fa(store.products?.length || 0)}</span>
            <span className="text-[10px] text-indigo-200 mt-0.5">محصول</span>
          </div>
        </div>
      </div>
    </header>
  );
});