import { 
  Utensils, Shirt, Home, Wrench, GraduationCap, 
  Heart, Car, Scissors, Package 
} from "lucide-react";
import { ThemeConfig } from "./types";

export const GROUP_CONFIG: Record<string, ThemeConfig> = {
  "خوراکی و سوپرمارکت": { 
    icon: Utensils, 
    gradient: "from-amber-400 to-orange-500", 
    lightBg: "bg-amber-50", 
    darkBg: "dark:bg-amber-500/10", 
    iconColor: "text-amber-600 dark:text-amber-400" 
  },
  "پوشاک و مد": { 
    icon: Shirt, 
    gradient: "from-pink-400 to-rose-500", 
    lightBg: "bg-pink-50", 
    darkBg: "dark:bg-pink-500/10", 
    iconColor: "text-pink-600 dark:text-pink-400" 
  },
  "لوازم خانگی": { 
    icon: Home, 
    gradient: "from-blue-400 to-indigo-500", 
    lightBg: "bg-blue-50", 
    darkBg: "dark:bg-blue-500/10", 
    iconColor: "text-blue-600 dark:text-blue-400" 
  },
  "خدمات": { 
    icon: Wrench, 
    gradient: "from-emerald-400 to-teal-500", 
    lightBg: "bg-emerald-50", 
    darkBg: "dark:bg-emerald-500/10", 
    iconColor: "text-emerald-600 dark:text-emerald-400" 
  },
  "آموزش": { 
    icon: GraduationCap, 
    gradient: "from-indigo-400 to-violet-500", 
    lightBg: "bg-indigo-50", 
    darkBg: "dark:bg-indigo-500/10", 
    iconColor: "text-indigo-600 dark:text-indigo-400" 
  },
  "سلامت و زیبایی": { 
    icon: Heart, 
    gradient: "from-red-400 to-rose-600", 
    lightBg: "bg-red-50", 
    darkBg: "dark:bg-red-500/10", 
    iconColor: "text-red-600 dark:text-red-400" 
  },
  "خودرو": { 
    icon: Car, 
    gradient: "from-slate-500 to-gray-700", 
    lightBg: "bg-slate-100", 
    darkBg: "dark:bg-slate-500/10", 
    iconColor: "text-slate-700 dark:text-slate-300" 
  },
  "هنر و صنایع دستی": { 
    icon: Scissors, 
    gradient: "from-violet-400 to-purple-600", 
    lightBg: "bg-violet-50", 
    darkBg: "dark:bg-violet-500/10", 
    iconColor: "text-violet-600 dark:text-violet-400" 
  },
};

export const DEFAULT_CONFIG: ThemeConfig = {
  icon: Package,
  gradient: "from-teal-400 to-emerald-500",
  lightBg: "bg-teal-50",
  darkBg: "dark:bg-teal-500/10",
  iconColor: "text-teal-600 dark:text-teal-400",
};