import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Map as MapIcon, AlertCircle, Check, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// رفع مشکل آیکون‌های پیش‌فرض لیفلت در باندلرها
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  location: { lat: number; lng: number } | null;
  setLocation: (loc: { lat: number; lng: number }) => void;
}

function LocationPicker({ position, setPosition }: { position: MapModalProps['location'], setPosition: MapModalProps['setLocation'] }) {
  useMapEvents({
    click(e) {
      setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function MapModal({ isOpen, onClose, location, setLocation }: MapModalProps) {
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (isOpen && !location && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {
          setLocation({ lat: 35.6892, lng: 51.389 }); // تهران به عنوان پیش‌فرض
          setGeoError(true);
        }
      );
    }
  }, [isOpen, location, setLocation]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, y: "100%" }} 
          animate={{ opacity: 1, y: 0 }} 
          exit={{ opacity: 0, y: "100%" }} 
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-[#0B0F19]" 
          dir="rtl"
        >
          
          <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 px-5 pt-8 pb-4 flex items-center justify-between z-10 shadow-sm">
            <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg bg-[var(--brand-primary)]/10 flex items-center justify-center">
                <MapIcon className="w-4 h-4 text-[var(--brand-primary)]" />
              </div> 
              انتخاب موقعیت فروشگاه
            </h2>
            <button onClick={onClose} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          </header>

          {geoError && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border-b border-amber-200 dark:border-amber-500/20 px-5 py-2.5 flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-bold">
              <AlertCircle className="w-4 h-4" /> موقعیت دقیق شما در دسترس نیست، نقشه روی تهران تنظیم شده است.
            </div>
          )}

          <div className="flex-1 relative z-0">
            <MapContainer 
              center={location || [35.6892, 51.389]} 
              zoom={14} 
              style={{ width: "100%", height: "100%", zIndex: 0 }} 
              zoomControl={false}
            >
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker position={location} setPosition={setLocation} />
            </MapContainer>

            {/* دکمه مکان‌یاب */}
            <div className="absolute top-4 right-4 z-[10]">
              <button 
                onClick={() => navigator.geolocation?.getCurrentPosition(p => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }))} 
                className="w-10 h-10 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg rounded-xl flex items-center justify-center text-[var(--brand-primary)] hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Navigation className="w-5 h-5" />
              </button>
            </div>

            {/* کارت پایین نقشه */}
            <div className="absolute bottom-6 inset-x-0 px-5 z-[10]">
              <div className="bg-white/95 dark:bg-slate-800/95 backdrop-blur-2xl border border-slate-200 dark:border-slate-700 rounded-2xl p-4 shadow-2xl">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 text-center">
                  روی نقشه ضربه بزنید تا مکان فروشگاه مشخص شود
                </p>
                <motion.button 
                  onClick={() => { if (location) onClose(); }} 
                  disabled={!location} 
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white font-black rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[var(--brand-glow)] transition-all"
                >
                  {location ? <><Check className="w-5 h-5"/> تأیید موقعیت مکانی</> : "در انتظار انتخاب مکان..."}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}