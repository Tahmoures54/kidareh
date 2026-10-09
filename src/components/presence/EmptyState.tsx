import { Link } from "react-router-dom";
import { SearchX, Sparkles, Store } from "lucide-react";

interface Props {
  title: string;
  hint?: string;
  actionTo?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PresenceEmpty({ title, hint, actionTo, actionLabel, onAction }: Props) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
      <div className="relative mx-auto mb-5 h-24 w-24" aria-hidden="true">
        <div className="absolute inset-2 rounded-[28px] bg-gradient-to-br from-teal-100 via-cyan-50 to-sky-100 rotate-6" />
        <div className="absolute inset-2 flex items-center justify-center rounded-[28px] border border-white/80 bg-white/90 text-teal-700 shadow-[0_14px_35px_-20px_rgba(8,166,166,.65)]">
          <Store className="h-10 w-10" strokeWidth={1.7} />
        </div>
        <div className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-2xl border-2 border-white bg-amber-300 text-amber-900 shadow-md">
          <SearchX className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <Sparkles className="absolute -bottom-1 -left-1 h-6 w-6 text-teal-500 animate-pulse" />
        <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-sky-400" />
      </div>
      <p className="text-base font-black text-slate-800">{title}</p>
      {hint ? <p className="mt-2 text-sm font-bold leading-7 text-slate-400">{hint}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="mt-5 inline-flex h-12 items-center rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-95"
        >
          {actionLabel}
        </Link>
      ) : null}
      {onAction && actionLabel && !actionTo ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex h-12 items-center rounded-xl bg-gradient-to-l from-cyan-600 to-teal-500 px-6 text-sm font-black text-white shadow-lg shadow-cyan-500/25 transition hover:opacity-95"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
