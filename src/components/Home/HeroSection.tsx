import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { Search, Sparkles, TrendingUp } from "lucide-react";

export default function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="bg-gradient-to-br from-teal-500 via-cyan-500 to-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-teal-200/30 relative overflow-hidden"
    >
      {/* Background blur effects */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      </div>
      
      {/* Content */}
      <div className="relative z-10 space-y-4">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
            <span className="text-sm font-bold">خوش آمدید!</span>
          </div>
          <h2 className="text-2xl font-black leading-tight mb-1">
            هر چیزی رو پیدا کن
          </h2>
          <p className="text-sm text-white/80">
            میلیون‌ها کالا در انتظار تو 🚀
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Link 
            to="/search"
            className="inline-flex items-center gap-2 bg-white text-teal-600 px-6 py-3 rounded-xl text-sm font-bold hover:shadow-xl hover:scale-105 transition-all active:scale-95"
          >
            <Search className="w-4 h-4" />
            جستجو
          </Link>
          
          <Link 
            to="/categories"
            className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-white/30 transition-all active:scale-95"
          >
            <TrendingUp className="w-4 h-4" />
            دسته‌ها
          </Link>
        </div>
      </div>
    </motion.div>
  );
}