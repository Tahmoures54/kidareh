// src/pages/Search/components/SearchSkeleton.tsx
import React, { memo } from "react";

export const SearchSkeleton = memo(() => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-slate-800 rounded-[28px] border border-slate-100 dark:border-slate-700/50 p-4 animate-pulse"
      >
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-[22px] bg-slate-200 dark:bg-slate-700 flex-shrink-0 shimmer" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-full w-4/5" />
            <div className="h-3 bg-slate-100 dark:bg-slate-700/50 rounded-full w-2/3" />
            <div className="flex justify-between pt-4">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded-full w-24" />
              <div className="h-5 bg-slate-100 dark:bg-slate-700/50 rounded-full w-16" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
));