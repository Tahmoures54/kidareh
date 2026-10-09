export type StockFreshness =
  | { kind: "confirmed"; minutesAgo: number }
  | { kind: "stale"; minutesAgo: number }
  | { kind: "unknown"; minutesAgo: null };

/** SQLite CURRENT_TIMESTAMP فاقد پسوند timezone است؛ آن را UTC تفسیر می‌کنیم. */
function parseStockTimestamp(value: string): number {
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? value.replace(" ", "T") + "Z"
    : value;
  return Date.parse(normalized);
}

export function getStockFreshness(
  lastConfirmedAt: string | null | undefined,
  confidence: number | null | undefined = 1,
  nowMs = Date.now(),
  staleAfterMinutes = 120,
): StockFreshness {
  if (!lastConfirmedAt || confidence === null || confidence === undefined || confidence < 0.6) {
    return { kind: "unknown", minutesAgo: null };
  }

  const timestamp = parseStockTimestamp(lastConfirmedAt);
  if (!Number.isFinite(timestamp) || timestamp > nowMs + 5 * 60_000) {
    return { kind: "unknown", minutesAgo: null };
  }

  const minutesAgo = Math.max(0, Math.floor((nowMs - timestamp) / 60_000));
  if (minutesAgo > staleAfterMinutes) return { kind: "stale", minutesAgo };
  return { kind: "confirmed", minutesAgo };
}

export function stockFreshnessLabel(freshness: StockFreshness): string {
  if (freshness.kind === "unknown") return "نیاز به تأیید";
  if (freshness.kind === "stale") return "تأیید بیش از ۲ ساعت پیش";
  if (freshness.minutesAgo < 1) return "همین الآن تأیید شد";
  return freshness.minutesAgo === 1
    ? "۱ دقیقه پیش تأیید شد"
    : freshness.minutesAgo.toLocaleString("fa-IR") + " دقیقه پیش تأیید شد";
}
