// src/components/Home/CitySelector.tsx
import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Navigation2, ChevronLeft, X, Search, AlertCircle, Check } from "lucide-react";
import { iranCities } from "@data/processed/iranCities";

interface CitySelectorProps {
  selectedCity: string;
  displayLocation: string;
  gpsEnabled: boolean;
  onCityChange: (city: string, display: string, province: string) => void;
  variant?: "default" | "compact" | "light";
  disabled?: boolean;
}

// تنظیمات انیمیشن فنری
const springTransition = { type: "spring", stiffness: 350, damping: 25 };

/**
 * Premium CitySelector
 * Mobile: Bottom Sheet | Desktop: Floating Popover
 */
const CitySelector = memo(
  ({
    selectedCity,
    displayLocation,
    gpsEnabled,
    onCityChange,
    variant = "default",
    disabled = false,
  }: CitySelectorProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [isMobile, setIsMobile] = useState(false);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    /* تشخیص موبایل برای تغییر رفتار UI */
    useEffect(() => {
      const checkMobile = () => setIsMobile(window.innerWidth < 768);
      checkMobile();
      window.addEventListener("resize", checkMobile);
      return () => window.removeEventListener("resize", checkMobile);
    }, []);

    /* جلوگیری از اسکرول بدنه در حالت موبایل هنگام باز بودن Bottom Sheet */
    useEffect(() => {
      if (isOpen && isMobile) document.body.style.overflow = "hidden";
      else document.body.style.overflow = "unset";
      return () => { document.body.style.overflow = "unset"; };
    }, [isOpen, isMobile]);

    /* فیلتر شهرها - memoized */
    const filteredCities = useMemo(() => {
      const term = searchTerm.trim().toLowerCase();
      if (!term) return iranCities;
      return iranCities.filter(
        (city) =>
          city.name.toLowerCase().includes(term) ||
          city.province.toLowerCase().includes(term)
      );
    }, [searchTerm]);

    /* انتخاب شهر */
    const handleCitySelect = useCallback((city: (typeof iranCities)[0]) => {
      const display = city.display || `${city.name}، ${city.province}`;
      onCityChange(city.name, display, city.province);
      setIsOpen(false);
      setSearchTerm("");
    }, [onCityChange]);

    /* باز / بسته */
    const toggle = useCallback(() => {
      if (!disabled) setIsOpen((prev) => !prev);
    }, [disabled]);

    const close = useCallback(() => {
      setIsOpen(false);
      setSearchTerm("");
    }, []);

    /* بستن با کلیک بیرون (فقط برای دسکتاپ) */
    useEffect(() => {
      if (!isOpen || isMobile) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, close, isMobile]);

    /* بستن با Escape */
    useEffect(() => {
      if (!isOpen) return;
      const handleKeyDown = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, close]);

    /* فوکوس خودکار هوشمند (فقط در دسکتاپ تا کیبورد موبایل مزاحم نشود) */
    useEffect(() => {
      if (isOpen && !isMobile) {
        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
      }
    }, [isOpen, isMobile]);

    const displayText = displayLocation || selectedCity || "انتخاب شهر";

    /* DROPDOWN / BOTTOM SHEET CONTENT */
    const dropdown = (
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm md:hidden touch-none"
              onClick={close}
            />

            {/* Modal Container */}
            <motion.div
              key="dropdown"
              initial={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: -10 }}
              animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
              exit={isMobile ? { y: "100%" } : { opacity: 0, scale: 0.95, y: -10 }}
              transition={springTransition}
              className={`
                z-[70] bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl shadow-2xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden flex flex-col
                ${isMobile 
                  ? "fixed inset-x-0 bottom-0 rounded-t-[32px] max-h-[85vh] pb-[env(safe-area-inset-bottom)]" // Mobile Bottom Sheet
                  : variant === "compact"
                    ? "absolute left-0 right-0 top-full mt-2 w-80 rounded-2xl" // Desktop Dropdown
                    : "absolute right-0 top-full mt-2 w-80 rounded-2xl"
                }
              `}
              role="listbox"
            >
              {/* Mobile Visual Drag Indicator */}
              {isMobile && (
                <div className="w-full flex justify-center pt-3 pb-1">
                  <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
              )}

              {/* Header & Search */}
              <div className="bg-transparent border-b border-slate-100 dark:border-slate-800 p-4 pt-2">
                <div className="flex items-center justify-between mb-3 md:hidden">
                  <h3 className="font-black text-slate-900 dark:text-white text-lg">موقعیت مکانی</h3>
                  <button onClick={close} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="جستجوی شهر یا استان..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pr-10 pl-10 py-3 bg-slate-100 dark:bg-slate-800 border-transparent rounded-2xl text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                  />
                  {searchTerm && (
                    <button onClick={() => setSearchTerm("")} className="absolute left-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {gpsEnabled && (
                  <motion.button 
                    initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-3 py-2 rounded-xl w-full"
                  >
                    <Navigation2 className="w-4 h-4" />
                    موقعیت GPS من استفاده شود
                  </motion.button>
                )}
              </div>

              {/* Cities List */}
              <div className="flex-1 overflow-y-auto overscroll-contain hide-scrollbar">
                {filteredCities.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {filteredCities.slice(0, 100).map((city, index) => {
                      const isSelected = selectedCity === city.name;
                      return (
                        <motion.button
                          key={`${city.name}-${city.province}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: isMobile ? 0 : index * 0.015 }}
                          onClick={() => handleCitySelect(city)}
                          className={`
                            w-full text-right px-4 py-3.5 rounded-2xl text-sm transition-all duration-200 flex items-center justify-between group
                            ${isSelected 
                              ? "bg-indigo-50 dark:bg-indigo-500/10" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50"}
                          `}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className="flex flex-col">
                            <span className={`font-bold block ${isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-slate-900 dark:text-white"}`}>
                              {city.name}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {city.province}
                            </span>
                          </div>
                          {isSelected && (
                            <motion.div layoutId="check-icon" className="w-6 h-6 bg-indigo-100 dark:bg-indigo-500/20 rounded-full flex items-center justify-center">
                              <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            </motion.div>
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-4 py-12 text-center flex flex-col items-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                      <AlertCircle className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="text-base text-slate-900 dark:text-white font-bold mb-1">شهری پیدا نشد</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">لطفاً املای کلمه را بررسی کنید</p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );

    /* ================= TRIGGERS ================= */

    /* 1. COMPACT VARIANT (مدرن و ظریف) */
    if (variant === "compact") {
      return (
        <div ref={containerRef} className="relative">
          <motion.button
            onClick={toggle}
            whileTap={{ scale: 0.96 }}
            disabled={disabled}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 backdrop-blur-md border border-slate-200/50 dark:border-slate-700/50 rounded-xl px-3 py-2 transition-colors disabled:opacity-50"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            {gpsEnabled ? (
              <Navigation2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span className="truncate max-w-[120px] pt-0.5">{displayText}</span>
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
              <ChevronLeft className="w-3.5 h-3.5 opacity-60" />
            </motion.div>
          </motion.button>
          {dropdown}
        </div>
      );
    }

    /* 2. LIGHT VARIANT (کاملاً شیشه‌ای برای روی عکس‌ها) */
    if (variant === "light") {
      return (
        <div ref={containerRef} className="relative w-full">
          <motion.button
            onClick={toggle}
            whileTap={{ scale: 0.98 }}
            disabled={disabled}
            className="w-full flex items-center justify-between bg-white/10 dark:bg-black/20 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-bold hover:bg-white/20 transition-all disabled:opacity-50 shadow-lg shadow-black/5"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            <div className="flex items-center gap-2">
              {gpsEnabled ? <Navigation2 className="w-4 h-4 text-emerald-300" /> : <MapPin className="w-4 h-4" />}
              <span>{displayText}</span>
            </div>
            <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
              <ChevronLeft className="w-4 h-4" />
            </motion.div>
          </motion.button>
          {dropdown}
        </div>
      );
    }

    /* 3. DEFAULT VARIANT (متن با آیکون برای هدر) */
    return (
      <div ref={containerRef} className="relative">
        <motion.button
          onClick={toggle}
          whileTap={{ scale: 0.97 }}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors group disabled:opacity-50"
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <motion.div animate={{ rotate: gpsEnabled ? 0 : -20 }} className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full group-hover:bg-indigo-50 dark:group-hover:bg-indigo-500/20 transition-colors">
            <Navigation2 className={`w-3.5 h-3.5 ${gpsEnabled ? "text-emerald-500" : "text-slate-500 dark:text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400"}`} />
          </motion.div>
          <span className="truncate max-w-[150px]">{displayText}</span>
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }}>
            <ChevronLeft className="w-4 h-4 opacity-50 group-hover:opacity-100 group-hover:-translate-x-1 transition-all" />
          </motion.div>
        </motion.button>
        {dropdown}
      </div>
    );
  }
);

CitySelector.displayName = "CitySelector";

export default CitySelector;