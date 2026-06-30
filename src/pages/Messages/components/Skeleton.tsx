import React from "react";

export default function Skeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-4 animate-pulse shadow-sm"
        >
          <div className="w-14 h-14 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-1/3" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/6" />
            </div>
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}