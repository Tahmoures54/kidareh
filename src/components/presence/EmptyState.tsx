import React from "react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  hint?: string;
  actionTo?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function PresenceEmpty({ title, hint, actionTo, actionLabel, onAction }: Props) {
  return (
    <div className="presence-card rounded-[28px] p-8 text-center">
      <p className="font-black">{title}</p>
      {hint ? <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">{hint}</p> : null}
      {actionTo && actionLabel ? (
        <Link
          to={actionTo}
          className="mt-4 inline-flex h-11 items-center rounded-2xl bg-[var(--ink)] px-4 text-xs font-black text-white"
        >
          {actionLabel}
        </Link>
      ) : null}
      {onAction && actionLabel && !actionTo ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-11 items-center rounded-2xl bg-[var(--ink)] px-4 text-xs font-black text-white"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
