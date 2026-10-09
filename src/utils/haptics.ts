export type HapticKind = "light" | "success" | "warning";

/** بازخورد لمسی اختیاری؛ در مرورگرهای فاقد Vibration API بی‌صدا رد می‌شود. */
export function hapticFeedback(kind: HapticKind = "light"): void {
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;

  const pattern: number | number[] =
    kind === "success" ? [18, 35, 18] :
    kind === "warning" ? [45, 35, 45] :
    12;

  try {
    navigator.vibrate(pattern);
  } catch {
    // محدودیت مرورگر نباید جلوی تعامل اصلی را بگیرد.
  }
}
