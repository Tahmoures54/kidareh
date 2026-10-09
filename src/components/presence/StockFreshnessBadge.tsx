import { CheckCircle2, Clock3, CircleHelp } from "lucide-react";
import { getStockFreshness, stockFreshnessLabel } from "../../utils/stockFreshness";

interface StockFreshnessBadgeProps {
  lastConfirmedAt?: string | null;
  confidence?: number | null;
  compact?: boolean;
}

export default function StockFreshnessBadge({
  lastConfirmedAt,
  confidence,
  compact = false,
}: StockFreshnessBadgeProps) {
  const freshness = getStockFreshness(lastConfirmedAt, confidence);
  const confirmed = freshness.kind === "confirmed";
  const stale = freshness.kind === "stale";

  return (
    <span
      className={[
        "inline-flex max-w-full items-center gap-1.5 rounded-full border font-bold leading-5",
        compact ? "px-2 py-1 text-[9px]" : "px-2.5 py-1.5 text-[10px]",
        confirmed
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-slate-200 bg-slate-100 text-slate-600",
      ].join(" ")}
      title={stockFreshnessLabel(freshness)}
      aria-label={stockFreshnessLabel(freshness)}
    >
      {confirmed ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : stale ? <Clock3 className="h-3 w-3 shrink-0" /> : <CircleHelp className="h-3 w-3 shrink-0" />}
      <span>{stockFreshnessLabel(freshness)}</span>
    </span>
  );
}
