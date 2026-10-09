import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

const DEFAULT_SNAP_POINTS = [0.56, 0.9] as const;

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  /** ارتفاع هر نقطه به نسبت ارتفاع صفحه؛ مقدارها بین 0 و 1 هستند. */
  snapPoints?: readonly number[];
  initialSnap?: number;
}

/** Bottom sheet موبایل با snap points، drag-to-close، قفل اسکرول و پشتیبانی Escape. */
export default function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  snapPoints = DEFAULT_SNAP_POINTS,
  initialSnap = 1,
}: BottomSheetProps) {
  const safeSnapPoints = useMemo(
    () => snapPoints.length > 0
      ? snapPoints.map((point) => Math.min(0.96, Math.max(0.25, point))).sort((a, b) => a - b)
      : [...DEFAULT_SNAP_POINTS],
    [snapPoints]
  );
  const onCloseRef = useRef(onClose);
  const [snapIndex, setSnapIndex] = useState(Math.min(Math.max(initialSnap, 0), safeSnapPoints.length - 1));

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setSnapIndex(Math.min(Math.max(initialSnap, 0), safeSnapPoints.length - 1));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, initialSnap, safeSnapPoints.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-label={title}
        >
          <button
            type="button"
            aria-label="بستن پنجره"
            className="absolute inset-0 cursor-default bg-slate-950/45 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="kidareh-sheet-title"
            aria-describedby={description ? "kidareh-sheet-description" : undefined}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.22 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 850) {
                onClose();
                return;
              }
              if (info.offset.y < -65) {
                setSnapIndex(safeSnapPoints.length - 1);
                return;
              }
              if (info.offset.y > 55) {
                setSnapIndex(0);
              }
            }}
            initial={{ y: "100%" }}
            animate={{ y: 0, maxHeight: `${(safeSnapPoints[snapIndex] ?? safeSnapPoints[safeSnapPoints.length - 1] ?? 0.9) * 100}dvh` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 36 }}
            className="relative z-10 flex w-full max-w-3xl flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-white shadow-[0_-18px_70px_rgba(15,23,42,.22)]"
            style={{ touchAction: "pan-y", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="shrink-0 px-5 pb-3 pt-3">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 id="kidareh-sheet-title" className="text-base font-black text-slate-900">{title}</h2>
                  {description && <p id="kidareh-sheet-description" className="mt-1 text-xs leading-5 text-slate-500">{description}</p>}
                </div>
                <button type="button" onClick={onClose} aria-label="بستن" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 active:scale-95">
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {children}
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
