import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MapPin, Navigation2, ChevronLeft } from "lucide-react";
import { iranCities } from "../../data/iranCities";

interface CitySelectorProps {
  selectedCity: string;
  displayLocation: string;
  gpsEnabled: boolean;
  onCityChange: (city: string, display: string, province: string) => void;
  variant?: "default" | "compact" | "light";
}

export default function CitySelector({
  selectedCity,
  displayLocation,
  gpsEnabled,
  onCityChange,
  variant = "default",
}: CitySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // فیلتر شهر‌ها بر اساس جستجو
  const filteredCities = useMemo(() => {
    if (!searchTerm) return iranCities;
    
    return iranCities.filter(
      (city) =>
        city.name.includes(searchTerm) ||
        city.province.includes(searchTerm)
    );
  }, [searchTerm]);

  const handleCitySelect = (city: any) => {
    onCityChange(city.name, city.display, city.province);
    setIsOpen(false);
    setSearchTerm("");
  };

  // Variants برای هر نوع
  if (variant === "compact") {
    return (
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors"
      >
        <MapPin className="w-3.5 h-3.5" />
        <span className="truncate max-w-[120px]">{selectedCity || "انتخاب شهر"}</span>
        <ChevronLeft className={`w-3 h-3 transition-transform ${isOpen ? "rotate-90" : ""}`} />
      </motion.button>
    );
  }

  if (variant === "light") {
    return (
      <motion.div className="space-y-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-4 py-2.5 text-white text-sm font-bold hover:bg-white/30 transition-all"
        >
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            {selectedCity || "انتخاب شهر"}
          </div>
          <ChevronLeft className={`w-4 h-4 transition-transform ${isOpen ? "rotate-90" : ""}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto mx-4"
            >
              <div className="sticky top-0 bg-white border-b border-gray-100 p-3 rounded-t-2xl">
                <input
                  type="text"
                  placeholder="جستجوی شهر..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500"
                  autoFocus
                />
              </div>

              <div className="divide-y divide-gray-100">
                {filteredCities.map((city) => (
                  <motion.button
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    whileHover={{ backgroundColor: "#f0fdfa" }}
                    className="w-full text-right px-4 py-3 text-sm font-medium text-gray-900 hover:bg-teal-50 transition-colors"
                  >
                    <div className="font-bold text-gray-900">{city.name}</div>
                    <div className="text-xs text-gray-500">{city.province}</div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // Default variant
  return (
    <motion.div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors font-medium group"
      >
        <motion.div
          animate={{ rotate: gpsEnabled ? 0 : -45 }}
          transition={{ duration: 0.5 }}
        >
          <Navigation2 className={`w-3.5 h-3.5 ${gpsEnabled ? "text-green-500" : "text-gray-400"}`} />
        </motion.div>
        <span className="truncate max-w-[150px]">{displayLocation || selectedCity || "انتخاب شهر"}</span>
        <ChevronLeft className={`w-3 h-3 transition-transform group-hover:translate-x-1 ${isOpen ? "rotate-90" : ""}`} />
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl shadow-xl z-50 max-h-72 overflow-y-auto border border-gray-100"
          >
            {/* Search Header */}
            <div className="sticky top-0 bg-white border-b border-gray-100 p-3 rounded-t-2xl">
              <input
                type="text"
                placeholder="جستجوی شهر یا استان..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-200"
                autoFocus
              />
            </div>

            {/* Cities List */}
            <div className="divide-y divide-gray-50">
              {filteredCities.length > 0 ? (
                filteredCities.map((city, index) => (
                  <motion.button
                    key={city.name}
                    onClick={() => handleCitySelect(city)}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    whileHover={{ backgroundColor: "#f0fdfa" }}
                    className="w-full text-right px-4 py-3 text-sm hover:bg-teal-50 transition-colors"
                  >
                    <div className="font-bold text-gray-900">{city.name}</div>
                    <div className="text-xs text-gray-500">{city.province}</div>
                  </motion.button>
                ))
              ) : (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  شهری یافت نشد
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}