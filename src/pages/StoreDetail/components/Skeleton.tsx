import React, { memo } from "react";

export const StoreSkeleton = memo(() => (
  <div className="min-h-screen bg-[var(--bg-primary)]" dir="rtl" aria-busy="true" aria-label="در حال بارگذاری فروشگاه">
    <div className="h-[330px] bg-[var(--bg-tertiary)] relative overflow-hidden rounded-b-[3rem]">
      <div className="absolute inset-0 shimmer" />
      <div className="relative z-10 mx-auto flex max-w-[1120px] flex-col items-center px-5 pt-24 lg:flex-row lg:items-center lg:gap-8">
        <div className="h-24 w-24 shrink-0 rounded-[32px] bg-white/20 shimmer" />
        <div className="mt-5 w-full max-w-sm space-y-3 lg:mt-0">
          <div className="h-7 w-2/3 rounded-full bg-white/20 shimmer" />
          <div className="h-4 w-1/3 rounded-full bg-white/20 shimmer" />
          <div className="h-12 w-full rounded-2xl bg-white/15 shimmer" />
        </div>
      </div>
    </div>
    <div className="relative z-10 mx-auto -mt-7 max-w-[1280px] px-5">
      <div className="h-14 rounded-2xl bg-[var(--bg-secondary)] shimmer border border-[var(--border-light)]" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="overflow-hidden rounded-3xl border border-[var(--border-light)] bg-[var(--bg-secondary)]">
            <div className="aspect-[4/3] shimmer bg-[var(--bg-tertiary)]" />
            <div className="space-y-3 p-4">
              <div className="h-5 w-3/4 rounded-full shimmer bg-[var(--bg-tertiary)]" />
              <div className="h-4 w-1/2 rounded-full shimmer bg-[var(--bg-tertiary)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));