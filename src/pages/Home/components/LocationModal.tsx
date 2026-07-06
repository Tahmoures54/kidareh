import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check, Search } from "lucide-react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { iranCities } from "../../../../data/processed/iranCities";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface City {
  name: string;
  province: string;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  selectedProvince: string;
  onSelect: (city: string, display: string, province: string) => void; // اصلاح‌شده
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

/** نرمال‌سازی رشته فارسی برای جستجوی مقاوم */
function normalizeFA(str: string): string {
  return str
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/‌/g, " ") // نیم‌فاصله → فاصله
    .replace(/\s+/g, " ");
}

/** مرتب‌سازی الفبایی فارسی - یک‌بار خارج از کامپوننت */
const SORTED_CITIES: City[] = [...iranCities].sort((a, b) =>
  a.name.localeCompare(b.name, "fa")
);

const ITEM_HEIGHT = 64; // px - ارتفاع هر آیتم

// ─────────────────────────────────────────────
// Hook: useDebounce
// ─────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

// ─────────────────────────────────────────────
// Hook: useBodyScrollLock
// ─────────────────────────────────────────────
function useBodyScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [isLocked]);
}

// ─────────────────────────────────────────────
// Sub-component: CityItem
// ─────────────────────────────────────────────
interface CityItemProps {
  city: City;
  isSelected: boolean;
  onSelect: (city: City) => void;
  style: React.CSSProperties;
}

const CityItem = React.memo<CityItemProps>(
  ({ city, isSelected, onSelect, style }) => {
    const handleClick = useCallback(() => {
      onSelect(city);
    }, [city, onSelect]);

    return (
      <div style={style} className="px-4 py-1">
        <button
          onClick={handleClick}
          aria-selected={isSelected}
          className={`
            w-full flex items-center justify-between
            px-4 py-3 rounded-2xl
            transition-all duration-150
            active:scale-[0.98]
            text-sm
            ${
              isSelected
                ? `
                  bg-rose-50 dark:bg-rose-950/30
                  border border-rose-300 dark:border-rose-800
                `
                : `
                  hover:bg-[var(--bg-tertiary)]
                  border border-transparent
                `
            }
          `}
        >
          {/* نام شهر + استان */}
          <div className="flex flex-col items-start gap-0.5">
            <span
              className={`font-bold ${
                isSelected
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-[var(--text-primary)]"
              }`}
            >
              {city.name}
            </span>
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              {city.province}
            </span>
          </div>

          {/* نشانگر انتخاب */}
          {isSelected && (
            <Check
              className="w-4 h-4 shrink-0 text-rose-500"
              aria-hidden="true"
            />
          )}
        </button>
      </div>
    );
  }
);

CityItem.displayName = "CityItem";

// ─────────────────────────────────────────────
// Sub-component: EmptyState
// ─────────────────────────────────────────────
const EmptyState: React.FC<{ query: string }> = ({ query }) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <Search className="w-10 h-10 text-gray-300 dark:text-gray-700" />
    <p className="text-sm text-[var(--text-muted)] text-center">
      نتیجه‌ای برای{" "}
      <span className="font-bold text-[var(--text-primary)]">«{query}»</span>{" "}
      یافت نشد
    </p>
  </div>
);

// ─────────────────────────────────────────────
// Main Component: LocationModal
// ─────────────────────────────────────────────
export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  selectedProvince,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebounce(searchQuery, 250);
  const scrollParentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // قفل scroll صفحه پشتی
  useBodyScrollLock(isOpen);

  // ریست جستجو و فوکوس input هنگام باز شدن
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      // تأخیر کوچک برای اتمام انیمیشن ورود
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // بستن با کلید Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // فیلتر شهرها بر اساس جستجوی debounce‌شده
  const filteredCities = useMemo<City[]>(() => {
    const q = normalizeFA(debouncedQuery);
    if (!q) return SORTED_CITIES;

    return SORTED_CITIES.filter((city) => {
      const name = normalizeFA(city.name);
      const province = normalizeFA(city.province);
      return name.includes(q) || province.includes(q);
    });
  }, [debouncedQuery]);

  // Virtualizer برای رندر بهینه لیست بلند
  const virtualizer = useVirtualizer({
    count: filteredCities.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 8,
  });

  // انتخاب شهر – اکنون display مناسب ساخته و به والد می‌دهد
  const handleSelectCity = useCallback(
    (city: City) => {
      const display = `${city.name}، ${city.province}`;
      onSelect(city.name, display, city.province);
      onClose();
    },
    [onSelect, onClose]
  );

  // بستن مودال با drag
  const handleDragEnd = useCallback(
    (_: never, info: { offset: { y: number } }) => {
      if (info.offset.y > 120) onClose();
    },
    [onClose]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    []
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    searchInputRef.current?.focus();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          dir="rtl"
          role="dialog"
          aria-modal="true"
          aria-label="انتخاب شهر"
        >
          {/* ── Backdrop ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* ── Bottom Sheet ── */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="
              relative w-full max-w-lg
              bg-[var(--bg-primary)]
              border-t border-[var(--border-light)]
              rounded-t-3xl shadow-2xl
              flex flex-col
              max-h-[88vh]
            "
          >
            {/* ── Drag Handle ── */}
            <div
              className="pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing"
              aria-hidden="true"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* ── Header ── */}
            <div className="px-5 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                  <MapPin
                    className="w-4 h-4 text-rose-500"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="font-extrabold text-lg text-[var(--text-primary)]">
                  انتخاب شهر
                </h2>
              </div>

              <button
                onClick={onClose}
                aria-label="بستن پنجره انتخاب شهر"
                className="
                  p-2 rounded-full
                  hover:bg-[var(--bg-tertiary)]
                  text-[var(--text-muted)]
                  transition-colors
                "
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* ── Search ── */}
            <div className="px-5 pb-3">
              <div className="relative">
                <Search
                  className="
                    absolute right-3.5 top-1/2 -translate-y-1/2
                    w-4 h-4 text-[var(--text-muted)]
                    pointer-events-none
                  "
                  aria-hidden="true"
                />

                <input
                  ref={searchInputRef}
                  type="search"
                  role="searchbox"
                  aria-label="جستجوی شهر"
                  placeholder="جستجوی شهر یا استان..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="
                    w-full pl-10 pr-11 py-3
                    rounded-2xl
                    bg-[var(--bg-secondary)]
                    border border-[var(--border-light)]
                    text-sm text-[var(--text-primary)]
                    placeholder:text-gray-400
                    focus:outline-none
                    focus:ring-2 focus:ring-rose-500/40
                    focus:border-rose-500
                    transition-all
                  "
                />

                {/* دکمه پاک کردن جستجو */}
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ duration: 0.15 }}
                      onClick={handleClearSearch}
                      aria-label="پاک کردن جستجو"
                      className="
                        absolute left-3 top-1/2 -translate-y-1/2
                        p-1 rounded-full
                        bg-gray-200 dark:bg-gray-700
                        text-gray-500 dark:text-gray-400
                        hover:bg-gray-300 dark:hover:bg-gray-600
                        transition-colors
                      "
                    >
                      <X className="w-3 h-3" aria-hidden="true" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              {/* تعداد نتایج */}
              <p
                className="text-[11px] text-[var(--text-muted)] mt-2 pr-1"
                aria-live="polite"
                aria-atomic="true"
              >
                {debouncedQuery
                  ? `${filteredCities.length} شهر یافت شد`
                  : `${SORTED_CITIES.length} شهر`}
              </p>
            </div>

            {/* ── Divider ── */}
            <div className="h-px bg-[var(--border-light)] mx-5" />

            {/* ── Cities List (Virtualized) ── */}
            <div
              ref={scrollParentRef}
              className="flex-1 overflow-y-auto overscroll-contain pb-6"
              role="listbox"
              aria-label="لیست شهرها"
            >
              {filteredCities.length === 0 ? (
                <EmptyState query={debouncedQuery} />
              ) : (
                <div
                  style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    position: "relative",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualItem) => {
                    const city = filteredCities[virtualItem.index];
                    const isSelected =
                      city.name === selectedCity &&
                      city.province === selectedProvince;

                    return (
                      <CityItem
                        key={`${city.name}-${city.province}`}
                        city={city}
                        isSelected={isSelected}
                        onSelect={handleSelectCity}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          height: `${virtualItem.size}px`,
                          transform: `translateY(${virtualItem.start}px)`,
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
