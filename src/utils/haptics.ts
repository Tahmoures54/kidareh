export type HapticKind = "light" | "medium" | "success" | "warning";

/** بازخورد لمسی اختیاری؛ در مرورگرهای فاقد vibrate بدون خطا نادیده گرفته می‌شود. */
export function triggerHaptic(kind: HapticKind = "light"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  const patterns: Record<HapticKind, number | number[]> = {
    light: 10,
    medium: 18,
    success: [10, 35, 12],
    warning: [18, 40, 18],
  };

  try {
    navigator.vibrate(patterns[kind]);
  } catch {
    // بعضی مرورگرها API را دارند اما اجازه اجرای آن را نمی‌دهند.
  }
}
