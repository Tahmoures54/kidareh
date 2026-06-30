import React, { memo } from "react";
import { Store, BadgeCheck, Loader2, MapPin } from "lucide-react";

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
    <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 rounded-[28px] p-5 mb-8 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-[20px] flex items-center justify-center relative">
            <Store className="w-6 h-6 text-slate-400 dark:text-slate-500" />
            {hasBlueTick && <BadgeCheck className="absolute -bottom-1 -right-1 w-5 h-5 text-blue-500 bg-white dark:bg-slate-800 rounded-full" />}
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              {storeName || "فروشگاه نامشخص"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-0.5">{followers.toLocaleString("fa-IR")} دنبال‌کننده</p>
          </div>
        </div>
        <button onClick={onFollow} disabled={followLoading} className={`px-4 py-2 rounded-xl text-xs font-black transition-colors ${following ? "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300" : "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"}`}>
          {followLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : following ? "دنبال شده" : "دنبال کردن"}
        </button>
      </div>
      
      <div className="pt-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center gap-4 text-xs font-bold text-slate-600 dark:text-slate-300">
        {distance && (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4 text-indigo-500" /> {distance} فاصله</div>
        )}
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-3 py-1.5 rounded-lg"><MapPin className="w-4 h-4 text-slate-400" /> {storeCity || "شهر نامشخص"}</div>
      </div>
    </div>
  );
});