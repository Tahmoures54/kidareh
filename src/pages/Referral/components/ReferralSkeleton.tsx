import React from "react";

export default function ReferralSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-40 bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]"></div>
      
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl"></div>
        ))}
      </div>

      <div className="h-32 bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]"></div>
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-[1.5rem]"></div>
    </div>
  );
}