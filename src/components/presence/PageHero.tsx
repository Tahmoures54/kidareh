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
      {kicker ? <p className="text-sm font-black text-[var(--accent)]">{kicker}</p> : null}
      <h1 className={`${kicker ? "mt-1" : ""} text-[1.75rem] font-black leading-snug tracking-tight text-[var(--ink)] sm:text-3xl`}>
        {title}
      </h1>
      {children ? (
        <div className="mt-2 max-w-2xl text-sm font-bold leading-7 text-[var(--ink-soft)]">{children}</div>
      ) : null}
    </header>
  );
}
