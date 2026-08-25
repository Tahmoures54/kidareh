import React from "react";

export function StoresSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 border border-gray-100 dark:border-gray-800 animate-pulse flex gap-4 shadow-sm">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2" />
            <div className="flex gap-2 pt-1">
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-lg" />
              <div className="h-5 w-20 bg-gray-200 dark:bg-gray-800 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}