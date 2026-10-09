import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useState, type ReactNode } from "react";
import { X } from "lucide-react";

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  snapPoints?: readonly string[];
  initialSnap?: number;
  closeOnBackdrop?: boolean;
  className?: string;
}

/** Bottom sheet موبایل‌محور با snap point، کشیدن برای بستن و پشتیبانی صفحه‌کلید. */
export default function BottomSheet({
  open,
  onClose,
  title,
  children,
  snapPoints = ["52dvh", "78dvh", "92dvh"],
  initialSnap = 1,
  closeOnBackdrop = true,
  className = "",
}: BottomSheetProps) {
  const titleId = useId();
  const [snapIndex, setSnapIndex] = useState(() =>
    Math.max(0, Math.min(initialSnap, snapPoints.length - 1)),
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    setSnapIndex(Math.max(0, Math.min(initialSnap, snapPoints.length - 1)));
  }, [initialSnap, snapPoints.length, open]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
    if (info.offset.y > 120 || info.velocity.y > 850) {
      onClose();
      return;
    }
    if (info.offset.y < -70 || info.velocity.y < -650) {
      setSnapIndex((current) => Math.min(current + 1, snapPoints.length - 1));
      return;
    }
    if (info.offset.y > 55) {
      setSnapIndex((current) => Math.max(current - 1, 0));
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/35 backdrop-blur-[2px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onClose();
          }}
          onTouchStart={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onClose();
          }}
          role="presentation"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.28 }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0, height: snapPoints[snapIndex] ?? "78dvh" }}
            exit={{ y: "100%" }}
            transition={{ type: "spring" as const, stiffness: 360, damping: 36 }}
            className={`relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/70 bg-white shadow-[0_-18px_60px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-slate-900 ${className}`}
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex shrink-0 justify-center pt-3 pb-1" aria-hidden="true">
              <span className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
            </div>
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 id={titleId} className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن پنجره"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition active:scale-95 hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
