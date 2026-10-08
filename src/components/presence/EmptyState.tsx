import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";

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
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600">
        <SearchX className="h-7 w-7" strokeWidth={2} />
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
