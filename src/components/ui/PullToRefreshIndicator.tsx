import { RefreshCw } from "lucide-react";

interface PullToRefreshIndicatorProps {
  distance: number;
  refreshing: boolean;
  threshold: number;
}

/** نشانگر کوچک و دسترس‌پذیر تازه‌سازی در بالای صفحه. */
export default function PullToRefreshIndicator({
  distance,
  refreshing,
  threshold,
}: PullToRefreshIndicatorProps) {
  const visible = refreshing || distance > 0;
  const ready = distance >= threshold;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={[
        "pointer-events-none fixed left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full",
        "border border-teal-100 bg-white/95 px-4 py-2 text-xs font-extrabold text-teal-800",
        "shadow-[0_8px_30px_rgba(8,166,166,0.18)] backdrop-blur-xl transition-[opacity,transform] duration-150",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      style={{
        top: "max(8px, env(safe-area-inset-top))",
        transform: `translate(-50%, ${visible ? Math.max(0, distance - 30) : -64}px)`,
      }}
    >
      <RefreshCw
        aria-hidden="true"
        className={["h-4 w-4", refreshing ? "animate-spin" : ready ? "rotate-180" : ""].join(" ")}
      />
      {refreshing ? "در حال تازه‌سازی…" : ready ? "رها کن تا تازه شود" : "برای تازه‌سازی بکش"}
    </div>
  );
}
