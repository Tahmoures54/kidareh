import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check, Search } from "lucide-react";
import { iranCities } from "../../../../data/processed/iranCities";

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCity: string;
  selectedProvince: string;
  onSelect: (city: string, display: string, province: string) => void;
}

export const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  selectedCity,
  selectedProvince,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery("");
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // لیست الفبایی همه شهرها (بدون گروه‌بندی)
  const sortedCities = useMemo(() => {
    return [...iranCities].sort((a, b) => a.name.localeCompare(b.name, 'fa'));
  }, []);

  // فیلتر مستقیم شهرها بر اساس جستجو
  const filteredCities = useMemo(() => {
    if (!searchQuery.trim()) return sortedCities;
    const q = searchQuery.trim();
    return sortedCities.filter(
      (city) =>
        city.name.includes(q) ||
        city.province.includes(q)
    );
  }, [searchQuery, sortedCities]);

  const handleSelectCity = (cityName: string, provinceName: string) => {
    onSelect(cityName, cityName, provinceName);
    onClose();
    setSearchQuery("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 120) onClose();
            }}
            className="relative w-full max-w-lg bg-[var(--bg-primary)] border-t border-[var(--border-light)] rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Drag Handle */}
            <div className="pt-3 pb-2 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-lg text-[var(--text-primary)]">انتخاب شهر</h3>
              </div>
              <button
                onClick={onClose}
                aria-label="بستن"
                className="p-2 rounded-full hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-3">
              <div className="relative">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="جستجوی شهر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Cities List */}
            <div className="px-4 pb-6 overflow-y-auto flex-1">
              {filteredCities.length === 0 ? (
                <p className="text-center text-sm text-[var(--text-muted)] py-12">
                  نتیجه‌ای یافت نشد
                </p>
              ) : (
                <div className="space-y-1">
                  {filteredCities.map((city) => {
                    const isSelected =
                      city.name === selectedCity && city.province === selectedProvince;
                    return (
                      <button
                        key={`${city.name}-${city.province}`}
                        onClick={() => handleSelectCity(city.name, city.province)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-[0.98] text-sm font-bold ${
                          isSelected
                            ? "bg-rose-50 dark:bg-rose-950/30 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                            : "hover:bg-[var(--bg-tertiary)] border border-transparent"
                        }`}
                      >
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-[var(--text-primary)]">{city.name}</span>
                          <span className="text-[10px] font-normal text-[var(--text-muted)]">
                            {city.province}
                          </span>
                        </div>
                        {isSelected && <Check className="w-4 h-4 shrink-0" />}
                      </button>
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
