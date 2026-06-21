import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { Sparkles, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface MagicAction {
  icon: LucideIcon;
  label: string;
  path: string;
  color: string;
}

interface MagicMenuProps {
  actions: MagicAction[];
  isOpen: boolean;
  onToggle: () => void;
  radius?: number;
  itemSize?: number;
}

export default function MagicMenu({ 
  actions, 
  isOpen, 
  onToggle,
  radius = 135,
  itemSize = 48
}: MagicMenuProps) {
  
  /**
   * فرمول هندسی برای محاسبه موقعیت دکمه‌ها در یک ربع دایره (90 درجه)
   * شروع از سمت چپ (180 درجه) و ختم به بالا (270 درجه)
   * این تضمین می‌کند که هیچ دکمه‌ای از صفحه بیرون نرود
   */
  const getRadialPosition = (index: number, total: number) => {
    // شروع از 180 درجه (سمت چپ)
    const startAngle = Math.PI;
    // ختم به 270 درجه (بالا)
    const endAngle = Math.PI * 1.5;
    // فاصله بین هر دکمه
    const angleStep = total > 1 ? (endAngle - startAngle) / (total - 1) : 0;
    // محاسبه زاویه برای این دکمه
    const angle = startAngle + (index * angleStep);

    // تبدیل زاویه به مختصات x, y
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return { x, y };
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center">
      <AnimatePresence>
        {isOpen && (
          <>
            {/* ==================== پرده تیره (Backdrop) ==================== */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
              onClick={onToggle}
              aria-hidden="true"
            />
            
            {/* ==================== کانتینر دکمه‌های منو ==================== */}
            <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex items-center justify-center pointer-events-none">
              {actions.map((action, index) => {
                const { x, y } = getRadialPosition(index, actions.length);
                const IconComponent = action.icon;

                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x,
                      y,
                      transition: { 
                        type: "spring", 
                        stiffness: 280, 
                        damping: 20, 
                        delay: index * 0.035,
                        mass: 0.8
                      }
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0,
                      x: 0,
                      y: 0,
                      transition: { 
                        duration: 0.15, 
                        delay: (actions.length - index - 1) * 0.02 
                      }
                    }}
                    style={{
                      position: "absolute",
                      width: itemSize,
                      height: itemSize,
                    }}
                    className="pointer-events-auto group"
                  >
                    <Link
                      to={action.path}
                      onClick={onToggle}
                      className={`w-full h-full rounded-full ${action.color} text-white shadow-lg shadow-black/20 flex items-center justify-center active:scale-90 hover:scale-110 transition-transform relative overflow-hidden`}
                      aria-label={action.label}
                    >
                      {/* شایع اثر روی دکمه */}
                      <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      
                      {/* آیکون */}
                      <div className="relative z-10">
                        <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                      
                      {/* Tooltip برای Hover */}
                      <motion.span 
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        whileHover={{ opacity: 1, scale: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none shadow-xl z-50"
                      >
                        {action.label}
                        {/* پیکان اشاره‌گر */}
                        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
                      </motion.span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ==================== گوی شناور اصلی (وسط پایین صفحه) ==================== */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={onToggle}
        className="w-16 h-16 sm:w-14 sm:h-14 bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-500 rounded-full shadow-2xl shadow-teal-500/40 flex items-center justify-center text-white relative z-50 border-2 border-white/90 hover:border-white transition-colors overflow-hidden cursor-pointer"
        aria-label={isOpen ? "بستن منوی امکانات" : "باز کردن منوی امکانات"}
        aria-expanded={isOpen}
      >
        {/* آیکون‌های متغیر */}
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div
              key="sparkles"
              initial={{ rotate: -180, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 180, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center w-full h-full"
            >
              <Sparkles className="w-7 h-7 sm:w-6 sm:h-6" />
            </motion.div>
          ) : (
            <motion.div
              key="close"
              initial={{ rotate: -180, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 180, scale: 0, opacity: 0 }}
              transition={{ duration: 0.25, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center w-full h-full"
            >
              <X className="w-7 h-7 sm:w-6 sm:h-6" />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Ping Animation - موج پالس‌زن وقتی منو بسته است */}
        <AnimatePresence>
          {!isOpen && (
            <motion.span
              initial={{ opacity: 0.5, scale: 1 }}
              animate={{ opacity: 0, scale: 2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 rounded-full bg-white/25 pointer-events-none"
            />
          )}
        </AnimatePresence>

        {/* شایع پس‌زمینه (Shimmer Effect) */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      </motion.button>
    </div>
  );
}