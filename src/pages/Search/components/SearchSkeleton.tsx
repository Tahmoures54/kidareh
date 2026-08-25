import React, { memo } from "react";

export const SearchSkeleton = memo(() => (
  <div className="space-y-3">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/50 p-4 animate-pulse"
      >
        <div className="flex gap-4">
          <div className="w-24 h-24 rounded-2xl bg-gray-200 dark:bg-gray-700 flex-shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full w-4/5" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded-full w-2/3" />
            <div className="h-3 bg-gray-100 dark:bg-gray-700/50 rounded-full w-1/2" />
            <div className="flex justify-between pt-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-full w-24" />
              <div className="h-5 bg-gray-100 dark:bg-gray-700/50 rounded-full w-16" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
));

SearchSkeleton.displayName = "SearchSkeleton";
