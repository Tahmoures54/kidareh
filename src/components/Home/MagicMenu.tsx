import { memo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface MagicAction {
  id?: string; // بهتر است اکشن‌ها id یکتا داشته باشند
  icon: LucideIcon;
  label: string;
  color: string;
  onClick: () => void;
}

interface MagicMenuProps {
  actions: MagicAction[];
  isOpen: boolean;
  onToggle: () => void;
}

// انیمیشن نرم و فنری
const springTransition = {
  type: "spring",
  stiffness: 350,
  damping: 25,
  mass: 0.8,
};

const MagicMenu = memo(function MagicMenu({ actions, isOpen, onToggle }: MagicMenuProps) {
  const firstButtonRef = useRef<HTMLButtonElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  // 1. مدیریت اسکرول و پرش صفحه + مدیریت فوکوس و کیبورد
  useEffect(() => {
    if (isOpen) {
      // محاسبه عرض اسکرول‌بار برای جلوگیری از پرش صفحه (در دسکتاپ)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;

      // انتقال فوکوس به اولین آیتم منو برای دسترسی‌پذیری (Screen Readers)
      // یک تاخیر کوچک می‌دهیم تا انیمیشن شروع شود و عنصر در DOM قرار بگیرد
      setTimeout(() => {
        firstButtonRef.current?.focus();
      }, 50);
    } else {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
      
      // برگرداندن فوکوس به دکمه اصلی بعد از بسته شدن منو
      setTimeout(() => {
        triggerBtnRef.current?.focus();
      }, 50);
    }

    return () => {
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
    };
  }, [isOpen]);

  // 2. بستن منو با دکمه Escape کیبورد
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      onToggle();
    }
  }, [isOpen, onToggle]);

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop (تاریک‌کننده پس‌زمینه) بهینه شده برای Accessibility */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="magic-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-40 bg-gray-900/40 dark:bg-black/70 backdrop-blur-sm touch-none outline-none"
            onClick={onToggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle();
              }
            }}
            role="button"
            aria-label="بستن منو"
            tabIndex={0}
          />
        )}
      </AnimatePresence>

      {/* Container اصلی */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex flex-col items-center pointer-events-none pb-[max(1rem,env(safe-area-inset-bottom))]">
        
        {/* پنل شیشه‌ای شامل دکمه‌ها */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="magic-panel"
              initial={{ y: "20%", opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "20%", opacity: 0, scale: 0.95 }}
              transition={springTransition}
              className="pointer-events-auto relative w-[92%] mb-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-gray-700/50 rounded-[2rem] p-5 pt-6 shadow-2xl shadow-gray-900/10 dark:shadow-black/40"
              role="menu"
              aria-orientation="vertical"
            >
              {/* خط کوچک کشویی بالای پنل */}
              <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full" aria-hidden="true" />

              <div className="grid grid-cols-4 gap-y-6 gap-x-2 mt-4">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  // ساخت یک key یکتا و پایدار
                  const uniqueKey = action.id || `action-${action.label.replace(/\s+/g, '-')}-${index}`;
                  
                  return (
                    <motion.div
                      key={uniqueKey}
                      initial={{ opacity: 0, y: 15, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ ...springTransition, delay: 0.05 + index * 0.03 }}
                    >
                      <button 
                        ref={index === 0 ? firstButtonRef : null} // فوکوس فقط برای اولین دکمه
                        onClick={() => {
                          action.onClick(); 
                        }} 
                        className="w-full flex flex-col items-center gap-2 group outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                        role="menuitem"
                        tabIndex={isOpen ? 0 : -1}
                      >
                        <div className={`relative w-14 h-14 ${action.color} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-active:scale-95 group-hover:-translate-y-1`}>
                          <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/20 to-white/40 rounded-2xl pointer-events-none" />
                          <Icon className="w-6 h-6 text-white drop-shadow-md z-10" strokeWidth={2.5} />
                        </div>
                        <span className="text-[10px] font-black text-gray-700 dark:text-gray-200 text-center leading-tight max-w-[72px] line-clamp-2">
                          {action.label}
                        </span>
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* دکمه اصلی (دکمه جادویی پایین) */}
        <motion.button
          ref={triggerBtnRef}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          aria-label={isOpen ? "بستن منوی دسترسی سریع" : "باز کردن منوی دسترسی سریع"}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          className={`pointer-events-auto relative w-14 h-14 rounded-full flex items-center justify-center overflow-hidden transition-all duration-300 z-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-teal-500 focus-visible:ring-offset-2
            ${isOpen
              ? "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-2 border-gray-200 dark:border-gray-700 shadow-lg"
              : "bg-gradient-to-tr from-teal-500 to-cyan-500 text-white shadow-xl shadow-teal-500/40 border-2 border-white/20 dark:border-gray-800/50"
            }`}
        >
          {/* افکت پالس نوری وقتی دکمه بسته است */}
          {!isOpen && (
            <span className="absolute inset-0 rounded-full bg-white/30 animate-ping mix-blend-overlay pointer-events-none" />
          )}

          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close-icon"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </motion.div>
            ) : (
              <motion.div
                key="open-icon"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.2 }}
              >
                <Sparkles className="w-6 h-6 drop-shadow-md" strokeWidth={2.5} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </>
  );
});

export default MagicMenu;