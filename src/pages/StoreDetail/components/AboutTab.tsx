import React, { memo } from "react";
import { Info, Calendar, Package, Navigation, MapPin } from "lucide-react";
import { StoreData, DistInfo } from "../types";
import { fa } from "../utils";

export const AboutTab = memo(({ store, distInfo }: { store: StoreData, distInfo: DistInfo | null }) => {
  type InfoItem = { icon: any; label: string; value: string };
  const infoItems: InfoItem[] = [
    { icon: Calendar, label: "عضویت", value: `عضو از ${fa(store.joined)}` },
    ...(store.category ? [{ icon: Package, label: "فعالیت", value: store.category }] : []),
    ...(distInfo ? [{ icon: Navigation, label: "فاصله زمانی", value: `حدود ${distInfo.mins} دقیقه` }] : []),
  ];

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 dark:text-white mb-3 flex items-center gap-2"><Info className="w-4 h-4 text-indigo-500" /> معرفی فروشگاه</h3>
        <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{store.description || `فروشگاه ${store.name} در دسته‌بندی ${store.category || "عمومی"} فعالیت می‌کند.`}</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-5 space-y-4 shadow-sm">
        {infoItems.map((item, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0"><item.icon className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /></div>
            <div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-0.5">{item.label}</p>
              <p className="text-xs font-black text-slate-800 dark:text-slate-200">{item.value}</p>
            </div>
          </div>
        ))}
        {store.address && (
          <div className="flex items-start gap-3 pt-2">
             <div className="w-10 h-10 bg-slate-50 dark:bg-slate-700 rounded-xl flex items-center justify-center shrink-0"><MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" /></div>
             <div>
               <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mb-0.5">آدرس حضوری {distInfo && `(${distInfo.text})`}</p>
               <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-relaxed">{store.city && <span className="text-indigo-600 dark:text-indigo-400">{store.city}، </span>}{store.address}</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
});