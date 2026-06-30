import React, { memo } from "react";

export const StoreSkeleton = memo(() => (
  <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0B0F19]">
    <div className="h-[40vh] bg-slate-200 dark:bg-slate-800 animate-pulse relative overflow-hidden">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
    <div className="bg-[#F8FAFC] dark:bg-[#0B0F19] -mt-10 rounded-t-[40px] p-6 space-y-6 relative z-10">
      <div className="w-24 h-24 rounded-[30px] bg-white dark:bg-slate-700 -mt-16 mx-auto animate-pulse" />
      <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-1/2 mx-auto animate-pulse" />
      <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-full w-1/3 mx-auto animate-pulse" />
      <div className="grid grid-cols-2 gap-4 mt-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-slate-200 dark:bg-slate-800 h-48 rounded-[28px] animate-pulse" />)}
      </div>
    </div>
  </div>
));