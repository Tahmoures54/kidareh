import { useCallback } from "react";

export type HapticKind = "light" | "success" | "selection";

/** بازخورد لمسی اختیاری؛ روی مرورگرهایی که از vibration پشتیبانی نمی‌کنند بی‌صدا رد می‌شود. */
export function useHaptics() {
  return useCallback((kind: HapticKind = "light") => {
    if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
    const pattern: Record<HapticKind, number | number[]> = {
      light: 10,
      selection: 6,
      success: [10, 35, 14],
    };
    try {
      navigator.vibrate(pattern[kind]);
    } catch {
      // برخی مرورگرها vibration را محدود می‌کنند؛ UX نباید به آن وابسته باشد.
    }
  }, []);
}
