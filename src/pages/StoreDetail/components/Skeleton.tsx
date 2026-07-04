import React, { memo } from "react";

export const StoreSkeleton = memo(() => (
  <div className="min-h-screen bg-[var(--bg-primary)]">
    <div className="h-[40vh] bg-[var(--bg-tertiary)] relative overflow-hidden rounded-b-[3rem]">
      <div className="absolute inset-0 shimmer" />
    </div>
    <div className="bg-[var(--bg-primary)] -mt-10 rounded-t-[40px] p-6 space-y-6 relative z-10">
      <div className="w-24 h-24 rounded-[30px] bg-[var(--bg-tertiary)] -mt-16 mx-auto shimmer border-4 border-[var(--bg-primary)]" />
      <div className="h-6 bg-[var(--bg-tertiary)] shimmer rounded-full w-1/2 mx-auto" />
      <div className="h-4 bg-[var(--bg-tertiary)] shimmer rounded-full w-1/3 mx-auto" />
      <div className="h-14 bg-[var(--bg-tertiary)] shimmer rounded-3xl mt-6" />
      <div className="grid grid-cols-2 gap-4 mt-8">
        {[1, 2, 3, 4].map(i => <div key={i} className="bg-[var(--bg-tertiary)] aspect-[4/5] rounded-3xl shimmer" />)}
      </div>
    </div>
  </div>
));