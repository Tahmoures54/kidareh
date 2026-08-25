import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/**
 * هدر یکسان برای همه صفحات داخلی — ساده و آشنا برای فروشنده
 */
export function PageHeader({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 bg-[var(--bg-primary,white)]/90 dark:bg-gray-950/90 backdrop-blur-xl border-b border-gray-200/60 dark:border-gray-800 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <button
          type="button"
          aria-label="بازگشت"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="w-11 h-11 shrink-0 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center active:scale-95 transition-transform"
        >
          <ArrowRight className="w-5 h-5 text-gray-700 dark:text-gray-200" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base sm:text-lg font-black text-gray-900 dark:text-white truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-gray-500 font-medium mt-0.5 truncate">{subtitle}</p>
          )}
        </div>
        {right}
      </div>
    </header>
  );
}

export default PageHeader;
