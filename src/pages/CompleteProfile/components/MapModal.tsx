import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Map as MapIcon, AlertCircle, Check } from "lucide-react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// رفع مشکل آیکون‌های Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const SPRING = { type: "spring" as const, stiffness: 400, damping: 30 };

function LocationPicker({ position, setPosition }: any) {
  useMapEvents({ click(e) { setPosition({ lat: e.latlng.lat, lng: e.latlng.lng }); } });
  return position ? <Marker position={position} /> : null;
}

export default function MapModal({ isOpen, onClose, location, setLocation }: any) {
  const [geoError, setGeoError] = useState(false);

  useEffect(() => {
    if (isOpen && !location && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (p) => setLocation({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => { setLocation({ lat: 35.6892, lng: 51.389 }); setGeoError(true); }
      );
    }
  }, [isOpen, location, setLocation]);

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0, y: "100%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "100%" }} transition={SPRING} className="fixed inset-0 z-[100] flex flex-col bg-white dark:bg-slate-950" dir="rtl">
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full z-20" />
      <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50 px-5 pt-8 pb-4 flex items-center justify-between z-10 shadow-sm">
        <h2 className="font-black text-slate-900 dark:text-white flex items-center gap-2 text-[15px]"><MapIcon className="w-5 h-5 text-cyan-500" /> انتخاب مکان فروشگاه</h2>
        <button onClick={onClose} className="w-9 h-9 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><X className="w-4 h-4" /></button>
      </header>
      {geoError && <div className="bg-amber-50 px-5 py-2 flex items-center gap-2 text-amber-700 text-[12px] font-bold"><AlertCircle className="w-4 h-4" /> موقعیت دقیق دریافت نشد، تهران نمایش داده شده.</div>}
      <div className="flex-1 relative z-0">
        <MapContainer center={location || [35.6892, 51.389]} zoom={14} style={{ width: "100%", height: "100%", zIndex: 0 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <LocationPicker position={location} setPosition={setLocation} />
        </MapContainer>
        <div className="absolute bottom-8 inset-x-0 px-5 z-[10]">
          <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl rounded-[28px] p-5 shadow-2xl">
            <button onClick={() => { if (location) onClose(); }} disabled={!location} className="w-full h-14 bg-cyan-500 text-white font-black rounded-[20px] disabled:opacity-50 flex items-center justify-center gap-2">
              {location ? <><Check className="w-5 h-5"/> تأیید مکان</> : "ابتدا مکان را انتخاب کنید"}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}