import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check, Search, ChevronRight } from "lucide-react";
import { iranCities } from "../../../data/processed/iranCities";

function groupByProvince(cities: typeof iranCities) {
  const map = new Map<string, string[]>();
  cities.forEach((city) => {
    if (!map.has(city.province)) map.set(city.province, []);
    map.get(city.province)!.push(city.name);
  });
  return Array.from(map.entries()).map(([province, cities]) => ({
    province,
    cities: cities.sort((a, b) => a.localeCompare(b, 'fa')),
  }));
}

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
  const [selProvince, setSelProvince] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSearchQuery("");
      setSelProvince(null);
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { 
      document.body.style.overflow = 'unset'; 
    };
  }, [isOpen]);

  const locations = useMemo(() => groupByProvince(iranCities), []);

  const filteredProvinces = useMemo(() => {
    if (!searchQuery) return locations;
    
    return locations.filter(
      (p) =>
        p.province.includes(searchQuery) ||
        p.cities.some((c) => c.includes(searchQuery))
    );
  }, [locations, searchQuery]);

  const activeProvinceData = useMemo(() => 
    locations.find((p) => p.province === selProvince),
    [locations, selProvince]
  );

  const handleSelectCity = (cName: string, pName: string) => {
    onSelect(cName, `${cName}`, pName);
    onClose();
    setSelProvince(null);
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
                  placeholder="جستجوی استان یا شهر..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-light)] text-sm text-[var(--text-primary)] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto flex-1 space-y-2">
              {selProvince && activeProvinceData ? (
                <div>
                  <button
                    onClick={() => setSelProvince(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:underline mb-3"
                  >
                    <ChevronRight className="w-4 h-4" /> بازگشت به لیست استان‌ها
                  </button>
                  <div className="font-bold text-sm mb-3 text-[var(--text-muted)]">
                    شهرهای {activeProvinceData.province}:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeProvinceData.cities.map((cName) => {
                      const isSelected = cName === selectedCity && activeProvinceData.province === selectedProvince;
                      return (
                        <button
                          key={cName}
                          onClick={() => handleSelectCity(cName, activeProvinceData.province)}
                          className={`flex items-center justify-between p-3 rounded-xl border text-sm font-bold transition-all active:scale-95 ${
                            isSelected
                              ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30"
                              : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-light)]"
                          }`}
                        >
                          <span>{cName}</span>
                          {isSelected && <Check className="w-4 h-4" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredProvinces.map((item) => {
                    const isCurrentProvince = item.province === selectedProvince;
                    return (
                      <button
                        key={item.province}
                        onClick={() => setSelProvince(item.province)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all active:scale-[0.98] text-sm font-bold ${
                          isCurrentProvince
                            ? "bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400"
                            : "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-light)]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-primary)]">{item.province}</span>
                          <span className="text-[10px] font-normal text-[var(--text-muted)]">
                            ({item.cities.length} شهر)
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 rotate-180 text-[var(--text-muted)]" />
                      </button>
                    );
                  })}
                  {filteredProvinces.length === 0 && (
                    <p className="text-center text-sm text-[var(--text-muted)] py-12">
                      نتیجه‌ای یافت نشد
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
