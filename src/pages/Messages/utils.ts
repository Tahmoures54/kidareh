import { Conversation } from './types';

export const AVATAR = "https://placehold.co/150x150/e0e7ff/4f46e5?text=Store";

export function fmtTime(ts: number): string {
  if (!Number.isFinite(ts)) return "—";
  const diff = Date.now() - ts;
  const day  = 86400000;
  if (diff < day) return new Date(ts).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 2 * day) return "دیروز";
  return new Date(ts).toLocaleDateString("fa-IR", { month: "short", day: "numeric" });
}

export function normalize(d: any, i: number): Conversation | null {
  const sid = String(d?.storeId ?? "").trim();
  if (!sid) return null;
  const ts = typeof d?.timestamp === "number" ? d.timestamp : d?.timestamp ? new Date(d.timestamp).getTime() : Date.now();
  return {
    id:           String(d?.id ?? `c-${i}`),
    storeId:      sid,
    storeName:    String(d?.storeName ?? "فروشگاه"),
    lastMessage:  String(d?.lastMessage ?? ""),
    time:         fmtTime(Number.isFinite(ts) ? ts : Date.now()),
    timestamp:    Number.isFinite(ts) ? ts : Date.now(),
    unread:       Math.max(0, Number(d?.unread ?? 0)),
    avatar:       String(d?.avatar ?? AVATAR),
    online:       Boolean(d?.online),
    lastProductId: d?.lastProductId ? String(d.lastProductId) : undefined,
  };
}