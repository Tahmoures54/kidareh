export default function PageHero({
  kicker,
  title,
  children,
}: {
  kicker?: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mb-6">
      {kicker ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-black text-cyan-600">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]" />
          {kicker}
        </p>
      ) : null}
      <h1
        className={`${kicker ? "mt-1.5" : ""} text-[1.75rem] font-black leading-snug tracking-tight text-slate-900 sm:text-3xl`}
      >
        {title}
      </h1>
      {children ? (
        <div className="mt-2.5 max-w-2xl text-sm font-bold leading-7 text-slate-500">{children}</div>
      ) : null}
    </header>
  );
}
