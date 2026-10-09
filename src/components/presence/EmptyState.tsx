import { Link } from "react-router-dom";
import { Search, ShoppingBag, Sparkles } from "lucide-react";

interface Props {
  title: string;
  hint?: string;
  actionTo?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PresenceEmpty({ title, hint, actionTo, actionLabel, onAction }: Props) {
  return (
    <div className="mx-auto w-full max-w-md rounded-[28px] border border-dashed border-slate-200 bg-white px-5 py-7 text-center sm:px-8 sm:py-9">
      <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-1 rounded-[30px] bg-gradient-to-br from-teal-50 via-cyan-50 to-sky-50" />
        <span className="absolute right-0 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="absolute bottom-1 left-0 flex h-6 w-6 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
          <Search className="h-3 w-3" />
        </span>
        <ShoppingBag className="relative h-10 w-10 text-teal-600" strokeWidth={1.8} />
      </div>
      <p className="text-base font-black leading-7 text-slate-900">{title}</p>
      {hint ? <p className="mx-auto mt-2 max-w-xs text-sm font-medium leading-7 text-slate-500">{hint}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-600 to-cyan-600 px-6 text-sm font-black text-white shadow-lg shadow-teal-600/15 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25"
        >
          {actionLabel}
        </Link>
      ) : null}
      {onAction && actionLabel && !actionTo ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-l from-teal-600 to-cyan-600 px-6 text-sm font-black text-white shadow-lg shadow-teal-600/15 transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500/25"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
