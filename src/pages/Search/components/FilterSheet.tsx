import React, { memo } from "react";
import { motion } from "framer-motion";
import { SlidersHorizontal, RotateCcw, Building, Map, Globe } from "lucide-react";
import { LocationScopeType, SearchFilters } from "../types";
import CategoryField from "../../../components/category/CategoryField";
import { RADIUS_OPTIONS } from "./constants";
import BottomSheet from "../../../components/ui/BottomSheet";

interface FilterSheetProps {
  open: boolean;
  filters: SearchFilters;
  onChange: (f: Partial<SearchFilters>) => void;
  onClose: () => void;
  onReset: () => void;
}

export const FilterSheet = memo(({ open, filters, onChange, onClose, onReset }: FilterSheetProps) => {
  const scopeOptions: { value: LocationScopeType; label: string; icon: React.ReactNode }[] = [
    {
      value: "city",
      label: filters.scope.name ? `شهر ${filters.scope.name}` : "شهر من",
      icon: <Building className="w-4 h-4" />,
    },
    {
      value: "province",
      label: filters.scope.province ? `استان ${filters.scope.province}` : "کل استان",
      icon: <Map className="w-4 h-4" />,
    },
    { value: "country", label: "سراسری", icon: <Globe className="w-4 h-4" /> },
  ];

  const sortOptions = [
    { value: "newest", label: "جدیدترین" },
    { value: "nearest", label: "نزدیک‌ترین" },
    { value: "cheapest", label: "ارزان‌ترین" },
  ];

  return (
    <BottomSheet open={open} onClose={onClose} title="فیلترها" snapPoints={["72dvh", "92dvh"]} initialSnap={0}>
      <div className="space-y-6" dir="rtl">


              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block">دسته‌بندی</label>
                <CategoryField
                  value={filters.category}
                  onChange={(category) => onChange({ category })}
                  label=""
                  placeholder="همه دسته‌ها"
                />
                {filters.category && (
                  <button
                    type="button"
                    onClick={() => onChange({ category: "" })}
                    className="mt-2 text-xs font-bold text-rose-500"
                  >
                    حذف دسته
                  </button>
                )}
              </div>
              
              {/* Scope */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block">
                  محدوده جستجو
                </label>
                <div className="flex gap-2 flex-wrap">
                  {scopeOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => onChange({ scope: { ...filters.scope, type: s.value } })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95 border ${
                        filters.scope.type === s.value
                          ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.icon}
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block">
                  ترتیب نمایش
                </label>
                <div className="flex gap-2 flex-wrap">
                  {sortOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => onChange({ sortBy: s.value as SearchFilters["sortBy"] })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
                        filters.sortBy === s.value
                          ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block">
                  شعاع جستجو
                </label>
                <div className="flex gap-2 flex-wrap">
                  {RADIUS_OPTIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => onChange({ selectedRadius: r.value })}
                      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 border ${
                        filters.selectedRadius === r.value
                          ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                          : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="text-xs font-bold text-gray-500 mb-3 block">
                  محدوده قیمت (تومان)
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="number"
                    placeholder="از قیمت"
                    value={filters.minPrice}
                    onChange={(e) => onChange({ minPrice: e.target.value })}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-colors"
                  />
                  <span className="text-gray-400 text-sm shrink-0">تا</span>
                  <input
                    type="number"
                    placeholder="تا قیمت"
                    value={filters.maxPrice}
                    onChange={(e) => onChange({ maxPrice: e.target.value })}
                    className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition-colors"
                  />
                </div>
              </div>

              {/* Only Available Toggle */}
              <div className="flex justify-between items-center py-3 px-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <span className="font-bold text-sm text-gray-800 dark:text-gray-200">
                  فقط کالاهای موجود
                </span>
                <button
                  onClick={() => onChange({ onlyAvailable: !filters.onlyAvailable })}
                  className={`relative w-12 h-7 rounded-full transition-colors duration-200 ${
                    filters.onlyAvailable ? "bg-rose-500" : "bg-gray-300 dark:bg-gray-600"
                  }`}
                  aria-pressed={filters.onlyAvailable}
                  aria-label="فقط کالاهای موجود"
                >
                  <motion.div
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md ${
                      filters.onlyAvailable ? "right-1" : "right-6"
                    }`}
                  />
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-[1fr_2fr] gap-3 pt-2">
                <button
                  onClick={onReset}
                  className="h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 font-black flex items-center justify-center gap-2 active:scale-95 transition-transform text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                >
                  <RotateCcw className="w-4 h-4" />
                  بازنشانی
                </button>
                <button
                  onClick={onClose}
                  className="h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black shadow-lg shadow-rose-500/30 active:scale-95 transition-all"
                >
                  نمایش نتایج
                </button>
              </div>
      </div>
    </BottomSheet>
  );
});

FilterSheet.displayName = "FilterSheet";
