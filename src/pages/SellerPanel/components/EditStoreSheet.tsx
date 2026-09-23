import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Store, Phone, AlignRight, Save, Loader2, MapPin, LocateFixed
} from "lucide-react";
import { StoreFormValues, storeFormSchema } from "../types";
import { citiesInProvince, iranProvinceNames } from "../../../data/processed/iranCities";
import CategoryField from "../../../components/category/CategoryField";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface EditStoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues: Partial<StoreFormValues>;
  onSave: (data: StoreFormValues) => void;
  isPending: boolean;
}

export const EditStoreSheet = ({
  isOpen,
  onClose,
  defaultValues,
  onSave,
  isPending,
}: EditStoreSheetProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues,
  });

  const province = watch("province") || "";
  const city = watch("city") || "";
  const provinceCities = citiesInProvince(province);
  const cityInList = provinceCities.some((item) => item.name === city);
  const lat = watch("lat");
  const lng = watch("lng");
  const [mapQuery, setMapQuery] = useState("");
  const openingHoursRaw = watch("opening_hours");
  const openingHours = (() => { try { return openingHoursRaw ? JSON.parse(openingHoursRaw) : {}; } catch { return {}; } })();
  const weekDays = [{ key: "sat", label: "شنبه" }, { key: "sun", label: "یکشنبه" }, { key: "mon", label: "دوشنبه" }, { key: "tue", label: "سه‌شنبه" }, { key: "wed", label: "چهارشنبه" }, { key: "thu", label: "پنجشنبه" }, { key: "fri", label: "جمعه" }];
  const updateOpeningDay = (key: string, patch: { closed?: boolean; open?: string; close?: string }) => { const current = { ...openingHours, [key]: { open: "09:00", close: "21:00", ...(openingHours[key] || {}), ...patch } }; setValue("opening_hours", JSON.stringify(current), { shouldDirty: true }); };
  const [mapSearching, setMapSearching] = useState(false);
  const [mapMessage, setMapMessage] = useState<string | null>(null);
  const mapCenter: [number, number] = lat != null && lng != null ? [lat, lng] : [35.6892, 51.3890];
  const markerIcon = L.divIcon({ className: "kidareh-store-picker", html: `<div style="width:30px;height:30px;border-radius:50% 50% 50% 0;background:#08a6a6;border:3px solid white;box-shadow:0 5px 15px rgba(0,0,0,.25);transform:rotate(-45deg)"><div style="width:8px;height:8px;border-radius:50%;background:white;position:absolute;left:8px;top:8px"></div></div>`, iconSize: [30, 30], iconAnchor: [15, 30] });
  function MapTools() {\n    const map = useMap();\n    const locate = () => {\n      if (!navigator.geolocation) { setMapMessage("مرورگر موقعیت مکانی را پشتیبانی نمی‌کند."); return; }\n      navigator.geolocation.getCurrentPosition((position) => {\n        const nextLat = Number(position.coords.latitude.toFixed(6));\n        const nextLng = Number(position.coords.longitude.toFixed(6));\n        setValue("lat", nextLat, { shouldDirty: true });\n        setValue("lng", nextLng, { shouldDirty: true });\n        map.flyTo([nextLat, nextLng], 17, { duration: 1 });\n        setMapMessage("موقعیت فعلی انتخاب شد.");\n      }, () => setMapMessage("دسترسی به موقعیت مکانی داده نشد."));\n    };\n    const searchAddress = async () => {\n      const query = mapQuery.trim();\n      if (!query) return;\n      setMapSearching(true); setMapMessage(null);\n      try {\n        const params = new URLSearchParams({ q: query, format: "jsonv2", limit: "5", addressdetails: "1", "accept-language": "fa" });\n        const response = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, { headers: { Accept: "application/json" } });\n        if (!response.ok) throw new Error("geocode");\n        const results = await response.json() as Array<{ lat: string; lon: string; display_name: string }>;\n        if (!results.length) { setMapMessage("آدرسی پیدا نشد. نام شهر، خیابان یا نشانی دقیق‌تر را امتحان کن."); return; }\n        const first = results[0]; const nextLat = Number(Number(first.lat).toFixed(6)); const nextLng = Number(Number(first.lon).toFixed(6));\n        setValue("lat", nextLat, { shouldDirty: true }); setValue("lng", nextLng, { shouldDirty: true });\n        setMapMessage(first.display_name); map.flyTo([nextLat, nextLng], 16, { duration: 1 });\n      } catch { setMapMessage("جستجوی آدرس انجام نشد. دوباره تلاش کن."); } finally { setMapSearching(false); }\n    };\n    return <div className="absolute inset-x-3 top-3 z-[500] flex flex-col gap-2 sm:flex-row">\n      <div className="flex flex-1 gap-2 rounded-xl bg-white/95 p-1.5 shadow-lg backdrop-blur">\n        <input value={mapQuery} onChange={(event) => setMapQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchAddress(); } }} placeholder="جستجوی شهر، خیابان یا آدرس" className="min-w-0 flex-1 bg-transparent px-2 text-xs font-bold outline-none" />\n        <button type="button" onClick={() => void searchAddress()} disabled={mapSearching} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[10px] font-black text-white disabled:opacity-50">{mapSearching ? "..." : "جستجو"}</button>\n      </div>\n      <button type="button" onClick={locate} className="rounded-xl bg-white/95 px-3 py-2 text-[10px] font-black text-[var(--ink)] shadow-lg backdrop-blur hover:bg-white"><LocateFixed className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" /> موقعیت من</button>\n      {mapMessage && <div className="absolute right-0 top-12 max-w-full rounded-xl bg-white/95 px-3 py-2 text-[10px] font-bold text-[var(--ink)] shadow-lg">{mapMessage}</div>}\n    </div>;\n  }\n  function LocationPicker() {
    useMapEvents({ click(event) { setValue("lat", Number(event.latlng.lat.toFixed(6)), { shouldDirty: true }); setValue("lng", Number(event.latlng.lng.toFixed(6)), { shouldDirty: true }); } });
    return lat != null && lng != null ? <Marker position={[lat, lng]} draggable eventHandlers={{ dragend: (event) => { const position = event.target.getLatLng(); setValue("lat", Number(position.lat.toFixed(6)), { shouldDirty: true }); setValue("lng", Number(position.lng.toFixed(6)), { shouldDirty: true }); } }} icon={markerIcon} /> : null;
  }

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 mx-auto w-full max-w-2xl bg-[var(--bg-secondary)] rounded-t-[2.5rem] lg:bottom-1/2 lg:max-w-4xl lg:translate-y-1/2 lg:rounded-[2rem] shadow-2xl border border-[var(--border-light)] overflow-hidden flex flex-col max-h-[92vh]"
            dir="rtl"
          >
            <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-3 border-b border-[var(--border-light)] px-5 lg:px-7">
              <div className="w-12 h-1.5 bg-[var(--border-light)] rounded-full mb-4" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[var(--brand-primary)]" /> ویرایش فروشگاه
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex justify-center items-center text-[var(--text-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <form
              onSubmit={handleSubmit(onSave)}
              className="flex-1 overflow-y-auto px-5 py-5 space-y-4 lg:px-7 lg:py-6 lg:grid lg:grid-cols-2 lg:gap-5 lg:space-y-0"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <Store className="w-3.5 h-3.5" /> نام فروشگاه
                </label>
                <input {...register("name")} className="input-base" />
                {errors.name && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.name.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <Phone className="w-3.5 h-3.5" /> شماره تماس
                </label>
                <input {...register("phone")} dir="ltr" className="input-base text-left" />
                {errors.phone && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.phone.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <CategoryField
                  value={watch("category") || ""}
                  onChange={(value) => setValue("category", value, { shouldValidate: true })}
                  label="دسته‌بندی"
                  required
                />
                {errors.category && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.category.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <AlignRight className="w-3.5 h-3.5" /> توضیح فروشگاه
                </label>
                <textarea {...register("description")} rows={3} className="input-base resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">استان</label>
                  <select
                    {...register("province", {
                      onChange: () => setValue("city", ""),
                    })}
                    className="input-base"
                  >
                    <option value="">انتخاب استان</option>
                    {iranProvinceNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">شهر</label>
                  <select {...register("city")} className="input-base" disabled={!province}>
                    <option value="">{province ? "انتخاب شهر" : "اول استان"}</option>
                    {!cityInList && city ? <option value={city}>{city}</option> : null}
                    {provinceCities.map((item) => (
                      <option key={`${item.name}-${item.province}`} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] ml-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> آدرس
                </label>
                <input {...register("address")} className="input-base" />
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-[var(--line)] bg-white p-4">
                <div className="mb-3">
                  <p className="text-sm font-black text-[var(--ink)]">ساعات کاری فروشگاه</p>
                  <p className="mt-1 text-[10px] font-bold text-[var(--ink-soft)]">ساعت کاری را ثبت کنید تا مشتری بداند چه زمانی می‌تواند حضوری مراجعه کند.</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {weekDays.map((day) => {
                    const value = openingHours[day.key] || {};
                    const closed = value.closed === true;
                    return <div key={day.key} className="rounded-xl border border-[var(--line)] bg-[#f8fcfd] p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-black text-[var(--ink)]">{day.label}</span>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-[var(--ink-soft)]">
                          <input type="checkbox" checked={closed} onChange={(e) => updateOpeningDay(day.key, { closed: e.target.checked })} />
                          تعطیل
                        </label>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="time" value={value.open || "09:00"} disabled={closed} onChange={(e) => updateOpeningDay(day.key, { open: e.target.value })} className="input-base text-left" />
                        <input type="time" value={value.close || "21:00"} disabled={closed} onChange={(e) => updateOpeningDay(day.key, { close: e.target.value })} className="input-base text-left" />
                      </div>
                    </div>;
                  })}
                </div>
              </div>

              <div className="lg:col-span-2 rounded-2xl border border-[var(--line)] bg-[#f4fbfc] p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-[var(--ink)] flex items-center gap-2"><MapPin className="w-4 h-4 text-[var(--accent)]" /> موقعیت روی نقشه</p>
                    <p className="mt-1 text-[10px] font-bold text-[var(--ink-soft)]">روی نقشه کلیک کن تا محل دقیق فروشگاه ثبت شود.</p>
                  </div>
                  {lat != null && lng != null && <span className="text-[10px] font-black text-[var(--accent)]" dir="ltr">{lat.toFixed(5)}, {lng.toFixed(5)}</span>}
                </div>
                <div className="relative h-64 overflow-hidden rounded-2xl border border-white shadow-sm">
                  <MapContainer center={mapCenter} zoom={lat != null && lng != null ? 16 : 5} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                    <LocationPicker />\n                    <MapTools />
                  </MapContainer>
                  <div className="pointer-events-none absolute bottom-3 right-3 z-[500] rounded-xl bg-white/90 px-3 py-2 text-[10px] font-black text-[var(--ink)] shadow-lg backdrop-blur">
                    <LocateFixed className="ml-1 inline h-3.5 w-3.5 text-[var(--accent)]" /> برای انتخاب محل کلیک کن
                  </div>
                </div>
              </div>
              <div className="pt-4 lg:col-span-2 lg:border-t lg:border-[var(--border-light)] lg:mt-1 lg:pt-5">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-lg shadow-[var(--brand-glow)] disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> در حال ذخیره…
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> ذخیره فروشگاه
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
