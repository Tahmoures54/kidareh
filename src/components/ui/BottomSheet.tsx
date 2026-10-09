import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  snapPoints?: number[];
  initialSnap?: number;
  description?: string;
}

/** Bottom sheet موبایل با snap point، بستن با drag و پشتیبانی صفحه‌کلید. */
export default function BottomSheet({
  open,
  title,
  children,
  onClose,
  snapPoints = [48, 82],
  initialSnap = 0,
  description,
}: BottomSheetProps) {
  const safePoints = snapPoints.length ? [...snapPoints].sort((a, b) => a - b) : [48];
  const [snapIndex, setSnapIndex] = useState(Math.min(Math.max(initialSnap, 0), safePoints.length - 1));
  const currentHeight = safePoints[snapIndex] ?? 48;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center" dir="rtl">
          <motion.button
            type="button"
            aria-label="بستن پنجره"
            className="absolute inset-0 cursor-default bg-slate-950/35 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: "100%" }}
            animate={{ y: 0, height: `${currentHeight}dvh` }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.04, bottom: 0.22 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 700) {
                onClose();
                return;
              }
              if (info.offset.y < -45 || info.velocity.y < -450) {
                setSnapIndex((current) => Math.min(safePoints.length - 1, current + 1));
                return;
              }
              if (info.offset.y > 35) {
                setSnapIndex((current) => Math.max(0, current - 1));
              }
            }}
            className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-t-[30px] border border-white/70 bg-white shadow-[0_-18px_70px_rgba(15,23,42,.22)]"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-200" />
            <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 pb-4 pt-4">
              <div>
                <h2 className="text-base font-black text-slate-900">{title}</h2>
                {description ? <p className="mt-1 text-xs font-medium leading-5 text-slate-500">{description}</p> : null}
              </div>
              <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 active:scale-95" aria-label="بستن">
                <X className="h-4 w-4" />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
