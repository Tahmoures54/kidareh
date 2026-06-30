import React, { memo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Flame, Sparkles, Gift, ShoppingBag, BadgeCheck, TrendingUp, Tag, Zap, ShoppingCart, Plus, Minus, Check
} from "lucide-react";
import { BadgeItem } from "./types";

// 👈 دیکشنری آیکون‌ها: نام متنی را به آیکون واقعی تبدیل می‌کند
const ICON_MAP: Record<string, React.ElementType> = {
  Flame, Sparkles, Gift, ShoppingBag, BadgeCheck, TrendingUp, Tag, Zap, ShoppingCart
};

export const AnimatedNumber = ({ value, className }: { value: number; className?: string }) => (
  <AnimatePresence mode="popLayout">
    <motion.span
      key={value}
      initial={{ opacity: 0, y: -15, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: 15, filter: "blur(4px)" }} transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`inline-block tabular-nums ${className}`}
    >
      {value.toLocaleString("fa-IR")}
    </motion.span>
  </AnimatePresence>
);

interface BadgeRowProps {
  badge: BadgeItem;
  quantity: number;
  price: number;
  onInc: () => void;
  onDec: () => void;
  variant?: "vip" | "store" | "regular";
}

export const BadgeRow = memo(({ badge, quantity, price, onInc, onDec, variant = "regular" }: BadgeRowProps) => {
  // اگر آیکون از دیتابیس ناشناخته بود، Sparkles نشان بده
  const Icon = ICON_MAP[badge.iconName] || Sparkles; 
  const selected = quantity > 0;

  const activeBorder =
    variant === "vip" ? "border-rose-500/50 ring-4 ring-rose-500/10 dark:ring-rose-500/20" :
    variant === "store" ? "border-blue-500/50 ring-4 ring-blue-500/10 dark:ring-blue-500/20" :
    "border-teal-500/50 ring-4 ring-teal-500/10 dark:ring-teal-500/20";
    
  const inactiveBorder = "border-gray-200/60 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700";

  return (
    <motion.div layout className={`relative bg-white dark:bg-gray-900 rounded-3xl border-2 transition-all duration-300 overflow-hidden ${selected ? activeBorder : inactiveBorder} ${selected ? 'shadow-lg shadow-gray-200/50 dark:shadow-none' : 'shadow-sm'}`}>
      {selected && <div className={`absolute inset-0 opacity-5 dark:opacity-10 bg-gradient-to-br ${badge.gradient} ${badge.darkGradient} pointer-events-none`} />}

      <div className="flex items-center gap-3.5 p-4 relative z-10">
        <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${badge.gradient} ${badge.darkGradient} shadow-inner`}>
          <Icon className={`w-6 h-6 ${badge.iconColor} drop-shadow-md`} />
          {selected && (
            <motion.div layoutId={`check-${badge.id}`} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-md">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            </motion.div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-black text-gray-900 dark:text-white text-sm truncate">{badge.name}</h3>
            <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight">
              {price.toLocaleString("fa-IR")}
              <span className="text-[9px] text-gray-500 dark:text-gray-400 font-bold mr-0.5">تومان</span>
            </p>
          </div>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium truncate leading-relaxed">{badge.desc}</p>
          
          <div className="mt-2 flex items-center">
            <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-md font-black bg-gradient-to-r ${badge.gradient} ${badge.darkGradient} ${badge.iconColor}`}>
              <Icon className="w-2.5 h-2.5" /> نمونه برچسب
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between bg-gray-50 dark:bg-gray-800/80 rounded-2xl p-1 h-20 w-10 border border-gray-100 dark:border-gray-800 shadow-inner flex-shrink-0">
          <button onClick={() => { onInc(); if(navigator.vibrate) navigator.vibrate(40); }} className="w-8 h-8 rounded-xl bg-white dark:bg-gray-700 flex items-center justify-center text-gray-900 dark:text-white shadow-sm active:scale-90 transition-transform">
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <span className="font-black text-gray-900 dark:text-white text-sm"><AnimatedNumber value={quantity} /></span>
          </div>
          <button onClick={() => { onDec(); if(navigator.vibrate) navigator.vibrate(20); }} disabled={quantity === 0} className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 ${quantity > 0 ? "bg-white dark:bg-gray-700 text-rose-500 dark:text-rose-400 shadow-sm" : "text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50"}`}>
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export const SectionHeader = ({ icon: Icon, title, badge, badgeColor }: { icon: any; title: string; badge: string; badgeColor: string }) => (
  <div className="flex items-center justify-between px-1 mb-4">
    <div className="flex items-center gap-2.5">
      <div className="p-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <Icon className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </div>
      <h2 className="text-base font-black text-gray-900 dark:text-white">{title}</h2>
    </div>
    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badgeColor}`}>{badge}</span>
  </div>
);