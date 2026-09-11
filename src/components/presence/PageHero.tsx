import React from "react";

export default function PageHero({
  kicker,
  title,
  children,
}: {
  kicker: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      <p className="text-[11px] font-black tracking-[0.2em] text-[var(--accent)]">{kicker}</p>
      <h1 className="mt-1 text-3xl font-black tracking-tight text-[var(--ink)]">{title}</h1>
      {children ? (
        <div className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[var(--ink-soft)]">{children}</div>
      ) : null}
    </header>
  );
}
