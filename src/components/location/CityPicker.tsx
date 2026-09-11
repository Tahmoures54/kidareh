import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, LocateFixed, MapPin, Search, X } from "lucide-react";
import {
  IRAN_CITIES_BY_PROVINCE,
  IRAN_CITY_COUNT,
  citiesInProvince,
  getPopularIranCities,
  searchIranCities,
  type IranCity,
} from "../../data/processed/iranCities";
import { cn } from "../../utils";

interface Props {
  open: boolean;
  selectedCity: string;
  selectedProvince: string;
  gpsLoading?: boolean;
  gpsError?: string | null;
  onClose: () => void;
  onSelect: (city: IranCity) => void;
  onGps?: () => void;
}

function normalize(value: string) {
  return value.replace(/ي/g, "ی").replace(/ك/g, "ک").trim();
}

export default function CityPicker({
  open,
  selectedCity,
  selectedProvince,
  gpsLoading,
  gpsError,
  onClose,
  onSelect,
  onGps,
}: Props) {
  const [query, setQuery] = useState("");
  const [province, setProvince] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popular = useMemo(() => getPopularIranCities(), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setProvince(null);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 250);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  const results = useMemo(() => searchIranCities(query, 60), [query]);
  const provinceCities = useMemo(
    () => (province ? citiesInProvince(province) : []),
    [province]
  );
  const searching = normalize(query).length > 0;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" dir="rtl" role="dialog" aria-modal="true" aria-label="انتخاب شهر">
      <button type="button" className="absolute inset-0 bg-black/45" aria-label="بستن" onClick={onClose} />
      <div className="relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-white shadow-2xl md:max-h-[85vh] md:rounded-[28px]">
        <div className="flex justify-center pt-3 md:hidden">
          <div className="h-1.5 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="flex items-center justify-between px-4 pb-2 pt-3">
          <div>
            <p className="text-[11px] font-black text-[var(--brand-primary)]">
              {IRAN_CITY_COUNT.toLocaleString("fa-IR")} شهر · {IRAN_CITIES_BY_PROVINCE.length.toLocaleString("fa-IR")} استان
            </p>
            <h2 className="text-lg font-black">انتخاب شهر</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--paper)]" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <label className="flex h-12 items-center gap-2 rounded-2xl bg-[var(--paper)] px-3">
            <Search className="h-4 w-4 text-[var(--muted)]" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setProvince(null);
              }}
              placeholder="جستجوی شهر یا استان…"
              className="h-full flex-1 bg-transparent text-sm font-bold outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="text-[var(--muted)]" aria-label="پاک کردن">
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          {onGps && (
            <button
              type="button"
              onClick={onGps}
              className="mt-2 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-3 text-sm font-black text-emerald-700"
            >
              <LocateFixed className={`h-4 w-4 ${gpsLoading ? "animate-spin" : ""}`} />
              اطراف من — تشخیص خودکار شهر
            </button>
          )}
          {gpsError && <p className="mt-2 text-xs font-bold text-rose-600">{gpsError}</p>}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">
          {searching ? (
            <ul className="space-y-1">
              {results.map((city) => (
                <CityRow
                  key={`${city.name}-${city.province}`}
                  city={city}
                  selected={city.name === selectedCity && city.province === selectedProvince}
                  onSelect={onSelect}
                />
              ))}
              {results.length === 0 && (
                <p className="py-10 text-center text-sm font-bold text-[var(--muted)]">شهری با این نام پیدا نشد</p>
              )}
            </ul>
          ) : province ? (
            <div>
              <button
                type="button"
                onClick={() => setProvince(null)}
                className="mb-3 inline-flex items-center gap-1 text-sm font-black text-[var(--brand-primary)]"
              >
                <ChevronLeft className="h-4 w-4 rotate-180" />
                همه استان‌ها
              </button>
              <p className="mb-2 text-sm font-black">{province}</p>
              <ul className="space-y-1">
                {provinceCities.map((city) => (
                  <CityRow
                    key={`${city.name}-${city.province}`}
                    city={city}
                    selected={city.name === selectedCity && city.province === selectedProvince}
                    onSelect={onSelect}
                  />
                ))}
              </ul>
            </div>
          ) : (
            <>
              <p className="mb-2 text-xs font-black text-[var(--muted)]">شهرهای پربازدید</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {popular.map((city) => {
                  const selected = city.name === selectedCity && city.province === selectedProvince;
                  return (
                    <button
                      key={city.slug || city.name}
                      type="button"
                      onClick={() => onSelect(city)}
                      className={cn(
                        "rounded-full px-3 py-2 text-[12px] font-black",
                        selected ? "bg-[var(--accent)] text-white" : "presence-chip"
                      )}
                    >
                      {city.name}
                    </button>
                  );
                })}
              </div>
              <p className="mb-2 text-xs font-black text-[var(--muted)]">همه استان‌ها</p>
              <ul className="space-y-1">
                {IRAN_CITIES_BY_PROVINCE.map((group) => (
                  <li key={group.province}>
                    <button
                      type="button"
                      onClick={() => setProvince(group.province)}
                      className="flex w-full items-center justify-between rounded-2xl px-3 py-3 text-right text-sm font-black hover:bg-[var(--paper)]"
                    >
                      <span>{group.province}</span>
                      <span className="text-[11px] font-bold text-[var(--muted)]">
                        {group.cities.length.toLocaleString("fa-IR")} شهر
                        <ChevronLeft className="mr-1 inline h-4 w-4" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CityRow({
  city,
  selected,
  onSelect,
}: {
  city: IranCity;
  selected: boolean;
  onSelect: (city: IranCity) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(city)}
        className={cn(
          "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-right",
          selected ? "bg-teal-50" : "hover:bg-[var(--paper)]"
        )}
      >
        <span>
          <span className="block text-sm font-black">{city.name}</span>
          <span className="text-[11px] font-bold text-[var(--muted)]">{city.province}</span>
        </span>
        {selected ? <Check className="h-4 w-4 text-[var(--brand-primary)]" /> : <MapPin className="h-4 w-4 text-[var(--muted)]" />}
      </button>
    </li>
  );
}
