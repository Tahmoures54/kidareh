import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Search,
  ChevronDown,
  ChevronUp,
  X,
  LayoutGrid,
  ChevronLeft,
  Sparkles,
  Package,
  ShoppingBag,
  Utensils,
  Wrench,
  Scissors,
  GraduationCap,
  Heart,
  Home,
  Car,
  Shirt,
  Zap,
  TrendingUp,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { categoriesData } from "../data/categories";

type CategoryType = {
  text: string;
  value: string;
};

type CategoryGroup = {
  id?: string | number;
  group: string;
  types: CategoryType[];
};

// نگاشت آیکون به نام گروه‌ها
const groupIcons: Record<string, React.ReactNode> = {
  "خوراکی و سوپرمارکت": <Utensils className="w-5 h-5" />,
  "پوشاک و مد": <Shirt className="w-5 h-5" />,
  "لوازم خانگی": <Home className="w-5 h-5" />,
  "خدمات": <Wrench className="w-5 h-5" />,
  "آموزش": <GraduationCap className="w-5 h-5" />,
  "سلامت و زیبایی": <Heart className="w-5 h-5" />,
  "خودرو": <Car className="w-5 h-5" />,
  "هنر و صنایع دستی": <Scissors className="w-5 h-5" />,
};

// رنگ‌های گروه‌ها
const groupColors: Record<
  string,
  {
    bg: string;
    icon: string;
    border: string;
    shadow: string;
    hover: string;
    badge: string;
  }
> = {
  "خوراکی و سوپرمارکت": {
    bg: "from-amber-50 to-orange-50",
    icon: "bg-amber-100 text-amber-600",
    border: "border-amber-200/50",
    shadow: "shadow-amber-500/10",
    hover: "hover:bg-amber-50 hover:border-amber-200",
    badge: "bg-amber-100 text-amber-700",
  },
  "پوشاک و مد": {
    bg: "from-pink-50 to-rose-50",
    icon: "bg-pink-100 text-pink-600",
    border: "border-pink-200/50",
    shadow: "shadow-pink-500/10",
    hover: "hover:bg-pink-50 hover:border-pink-200",
    badge: "bg-pink-100 text-pink-700",
  },
  "لوازم خانگی": {
    bg: "from-blue-50 to-cyan-50",
    icon: "bg-blue-100 text-blue-600",
    border: "border-blue-200/50",
    shadow: "shadow-blue-500/10",
    hover: "hover:bg-blue-50 hover:border-blue-200",
    badge: "bg-blue-100 text-blue-700",
  },
  "خدمات": {
    bg: "from-emerald-50 to-green-50",
    icon: "bg-emerald-100 text-emerald-600",
    border: "border-emerald-200/50",
    shadow: "shadow-emerald-500/10",
    hover: "hover:bg-emerald-50 hover:border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
  },
  "آموزش": {
    bg: "from-indigo-50 to-purple-50",
    icon: "bg-indigo-100 text-indigo-600",
    border: "border-indigo-200/50",
    shadow: "shadow-indigo-500/10",
    hover: "hover:bg-indigo-50 hover:border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
  },
  "سلامت و زیبایی": {
    bg: "from-red-50 to-rose-50",
    icon: "bg-red-100 text-red-600",
    border: "border-red-200/50",
    shadow: "shadow-red-500/10",
    hover: "hover:bg-red-50 hover:border-red-200",
    badge: "bg-red-100 text-red-700",
  },
  "خودرو": {
    bg: "from-slate-50 to-gray-50",
    icon: "bg-slate-100 text-slate-600",
    border: "border-slate-200/50",
    shadow: "shadow-slate-500/10",
    hover: "hover:bg-slate-50 hover:border-slate-200",
    badge: "bg-slate-100 text-slate-700",
  },
  "هنر و صنایع دستی": {
    bg: "from-violet-50 to-purple-50",
    icon: "bg-violet-100 text-violet-600",
    border: "border-violet-200/50",
    shadow: "shadow-violet-500/10",
    hover: "hover:bg-violet-50 hover:border-violet-200",
    badge: "bg-violet-100 text-violet-700",
  },
};

export default function Categories() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedGroups, setExpandedGroups] = useState<string[]>(
    categoriesData.map((g: CategoryGroup) => g.group)
  );

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) =>
      prev.includes(group) ? prev.filter((g) => g !== group) : [...prev, group]
    );
  };

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (!q) return categoriesData as CategoryGroup[];

    return (categoriesData as CategoryGroup[])
      .map((group) => ({
        ...group,
        types: group.types.filter(
          (type) =>
            type.text.toLowerCase().includes(q) ||
            type.value.toLowerCase().includes(q)
        ),
      }))
      .filter((group) => group.types.length > 0);
  }, [searchQuery]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedGroups(filteredCategories.map((g) => g.group));
    }
  }, [searchQuery, filteredCategories]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-teal-50/20 pb-24 relative overflow-hidden"
      dir="rtl"
    >
      {/* نورهای تزئینی */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-200/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl" />
      </div>

      {/* هدر */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-5 shadow-sm sticky top-0 z-20 rounded-b-3xl border-b border-gray-100"
      >
        {/* دکمه بازگشت و عنوان */}
        <div className="flex items-center gap-3 mb-5">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center transition-colors hover:bg-gray-100 shrink-0"
            title="بازگشت"
          >
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </motion.button>
          <div>
            <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                <LayoutGrid className="w-5 h-5 text-teal-600" />
              </motion.div>
              دسته‌بندی کالاها
            </h1>
            <p className="text-[10px] text-gray-500 font-bold mt-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              {filteredCategories.length} گروه دسته‌بندی
            </p>
          </div>
        </div>

        {/* نوار جستجو */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative group"
        >
          <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400 group-focus-within:text-teal-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="جستجو در دسته‌بندی‌ها..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-200 focus:border-teal-500 outline-none text-sm font-medium transition-all hover:border-gray-300 placeholder:text-gray-400"
          />
          <AnimatePresence>
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 hover:text-red-500 transition-colors"
                title="حذف جستجو"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.header>

      {/* محتوا */}
      <div className="p-4 space-y-3.5 relative z-10">
        <AnimatePresence mode="wait">
          {filteredCategories.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-300 shadow-sm mt-4"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-200"
              >
                <Search className="w-8 h-8 text-gray-400" />
              </motion.div>
              <h3 className="text-gray-900 font-black text-base mb-1.5">
                دسته‌بندی پیدا نشد
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                عبارتی متفاوت را جستجو کنید
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3.5"
            >
              {filteredCategories.map((group, groupIndex) => {
                const isExpanded = expandedGroups.includes(group.group);
                const icon = groupIcons[group.group] || <Package className="w-5 h-5" />;
                const colors = groupColors[group.group] || groupColors["خوراکی و سوپرمارکت"];

                return (
                  <motion.div
                    key={group.group}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: groupIndex * 0.05 }}
                    className={`bg-white rounded-2xl shadow-sm border-2 transition-all duration-300 overflow-hidden ${
                      isExpanded
                        ? `${colors.border} shadow-lg ${colors.shadow}`
                        : "border-gray-100 hover:shadow-md"
                    }`}
                  >
                    {/* هدر آکاردئون */}
                    <motion.button
                      onClick={() => toggleGroup(group.group)}
                      className={`w-full flex items-center justify-between p-4 transition-all ${
                        isExpanded
                          ? `bg-gradient-to-l ${colors.bg}`
                          : "bg-white hover:bg-gray-50/50"
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <motion.div
                          animate={{
                            scale: isExpanded ? 1.1 : 1,
                            rotate: isExpanded ? 5 : 0,
                          }}
                          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${colors.icon} shadow-sm`}
                        >
                          {icon}
                        </motion.div>
                        <div className="text-right">
                          <h2 className={`font-black text-sm transition-colors ${isExpanded ? "text-gray-900" : "text-gray-800"}`}>
                            {group.group}
                          </h2>
                          <p className="text-[10px] text-gray-500 font-bold mt-0.5">
                            {group.types.length} مورد
                          </p>
                        </div>
                      </div>

                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.3 }}
                        className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colors.icon}`}
                      >
                        <ChevronDown className="w-5 h-5" />
                      </motion.div>
                    </motion.button>

                    {/* محتوای آکاردئون */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className={`p-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t-2 ${colors.border}`}>
                            {group.types.map((type, typeIndex) => (
                              <motion.div
                                key={type.value}
                                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: typeIndex * 0.04 }}
                              >
                                <Link
                                  to={`/search?category=${encodeURIComponent(type.value)}`}
                                  className={`flex items-center justify-between p-3.5 bg-gray-50/50 rounded-xl transition-all border-2 border-gray-100 group hover:shadow-md ${colors.hover}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <motion.div
                                      whileHover={{ scale: 1.1 }}
                                      className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm border-2 border-gray-100 transition-all ${colors.badge} group-hover:shadow-md`}
                                    >
                                      <ShoppingBag className="w-4 h-4" />
                                    </motion.div>
                                    <span className="font-bold text-sm text-gray-800 group-hover:text-gray-900">
                                      {type.text}
                                    </span>
                                  </div>
                                  <motion.div
                                    animate={{ x: 0 }}
                                    whileHover={{ x: -3 }}
                                    className="text-gray-300 group-hover:text-gray-500 transition-colors"
                                  >
                                    <ChevronLeft className="w-4 h-4" />
                                  </motion.div>
                                </Link>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* فوتر معلومات */}
      {filteredCategories.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl rounded-t-3xl border-t border-gray-200 p-4 text-center z-20"
        >
          <p className="text-xs font-bold text-gray-600">
            💡 یک دسته رو انتخاب کنید تا محصولات آن رو ببینید
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}