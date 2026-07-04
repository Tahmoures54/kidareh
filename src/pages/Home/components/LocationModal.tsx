import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Check, Search, ChevronRight } from "lucide-react";
import { iranCities } from "../../../../data/processed/iranCities";

function groupByProvince(cities: typeof iranCities) {
  const map = new Map<string, string[]>();
  cities.forEach((city) => {
    if (!map.has(city.province)) map.set(city.province, []);
    map.get(city.province)!.push(city.name);
  });
  return Array.from(map.entries()).map(([province, cities]) => ({
    province,
    cities,
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

  // قفل کردن اسکرول بدنه هنگام باز بودن مودال
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const locations = useMemo(() => groupByProvince(iranCities), []);

  const filteredProvinces = locations.filter(
    (p) =>
      p.province.includes(searchQuery) ||
      p.cities.some((c) => c.includes(searchQuery))
  );

  const activeProvinceData = locations.find((p) => p.province === selProvince);

  const handleSelectCity = (cName: string, pName: string) => {
    onSelect(cName, `${cName} (${pName})`, pName);
    onClose();
    setSelProvince(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" dir="rtl">
          {/* بک‌گراند تیره */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* بدنه Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(e, info) => { if (info.offset.y > 100) onClose(); }}
            className="relative w-full max-w-lg bg-[var(--bg-secondary)] border border-[var(--border-light)]/40 rounded-t-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* هندل درگ */}
            <div className="pt-3 flex justify-center">
              <div className="w-10 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
            </div>

            {/* Header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-rose-500" />
                <h3 className="font-extrabold text-lg">انتخاب موقعیت مکانی</h3>
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
                  className="w-full pl-4 pr-10 py-3 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-light)]/40 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                />
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-6 overflow-y-auto flex-1 space-y-4">
              {selProvince && activeProvinceData ? (
                <div>
                  <button
                    onClick={() => setSelProvince(null)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-rose-500 hover:underline mb-3"
                  >
                    <ChevronRight className="w-4 h-4" /> بازگشت به لیست استان‌ها
                  </button>
                  <div className="font-extrabold text-sm mb-3 text-[var(--text-muted)]">
                    شهرهای استان {activeProvinceData.province}:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {activeProvinceData.cities.map((cName) => {
                      const isSelected = cName === selectedCity;
                      return (
                        <button
                          key={cName}
                          onClick={() => handleSelectCity(cName, activeProvinceData.province)}
                          className={`flex items-center justify-between p-3 rounded-2xl border text-sm font-bold transition-all active:scale-95 ${
                            isSelected
                              ? "bg-rose-500 text-white border-rose-500"
                              : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-light)]/30"
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
                <div className="space-y-1.5">
                  {filteredProvinces.map((item) => {
                    const isCurrentProvince = item.province === selectedProvince;
                    return (
                      <button
                        key={item.province}
                        onClick={() => setSelProvince(item.province)}
                        className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98] text-sm font-bold ${
                          isCurrentProvince
                            ? "bg-rose-500/10 border-rose-500/50 text-rose-500"
                            : "bg-[var(--bg-primary)] hover:bg-[var(--bg-tertiary)] border-[var(--border-light)]/20"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{item.province}</span>
                          <span className="text-[10px] font-normal text-[var(--text-muted)]">
                            ({item.cities.length} شهر)
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 rotate-180 text-[var(--text-muted)]" />
                      </button>
                    );
                  })}
                  {filteredProvinces.length === 0 && (
                    <p className="text-center text-sm text-[var(--text-muted)] py-8">
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