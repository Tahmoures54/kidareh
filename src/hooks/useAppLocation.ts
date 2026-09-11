import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_IRAN_CITY,
  findIranCity,
  findNearestIranCity,
  isTehranCity,
  type IranCity,
} from "../data/processed/iranCities";
import { DEFAULT_ORIGIN, NEIGHBORHOODS } from "../presence/catalog";
import type { PresenceOrigin } from "../presence/types";

export const APP_CITY_KEY = "kidareh_app_city_v1";
export const LEGACY_CITY_KEY = "manual-location";
export const APP_CITY_EVENT = "kidareh-city-change";

export interface AppLocation {
  city: string;
  province: string;
  display: string;
  slug?: string;
  lat: number;
  lng: number;
  source: "manual" | "gps";
}

const TEHRAN: AppLocation = {
  city: DEFAULT_IRAN_CITY.name,
  province: DEFAULT_IRAN_CITY.province,
  display: DEFAULT_IRAN_CITY.display,
  slug: DEFAULT_IRAN_CITY.slug,
  lat: DEFAULT_IRAN_CITY.lat ?? DEFAULT_ORIGIN.lat,
  lng: DEFAULT_IRAN_CITY.lng ?? DEFAULT_ORIGIN.lng,
  source: "manual",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function fromCity(city: IranCity, source: AppLocation["source"]): AppLocation {
  return {
    city: city.name,
    province: city.province,
    display: city.display,
    slug: city.slug,
    lat: city.lat ?? TEHRAN.lat,
    lng: city.lng ?? TEHRAN.lng,
    source,
  };
}

function parseLocation(raw: unknown): AppLocation | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const city = String(value.city || "").trim();
  if (!city) return null;
  const matched = findIranCity(city, String(value.province || "") || undefined) ?? findIranCity(city);
  if (matched) {
    return {
      ...fromCity(matched, value.source === "gps" ? "gps" : "manual"),
      display: String(value.display || matched.display),
    };
  }
  return {
    city,
    province: String(value.province || ""),
    display: String(value.display || city),
    slug: String(value.slug || ""),
    lat: Number(value.lat) || TEHRAN.lat,
    lng: Number(value.lng) || TEHRAN.lng,
    source: value.source === "gps" ? "gps" : "manual",
  };
}

export function readAppLocation(): AppLocation {
  if (!canUseStorage()) return TEHRAN;
  try {
    const current = window.localStorage.getItem(APP_CITY_KEY);
    if (current) {
      const parsed = parseLocation(JSON.parse(current));
      if (parsed) return parsed;
    }
    const legacy = window.localStorage.getItem(LEGACY_CITY_KEY);
    if (legacy) {
      const parsed = parseLocation(JSON.parse(legacy));
      if (parsed) return parsed;
    }
  } catch {
    /* ignore */
  }
  return TEHRAN;
}

function originFromAppLocation(location: AppLocation): PresenceOrigin {
  if (isTehranCity(location.city)) {
    let neighborhoodId: PresenceOrigin["neighborhoodId"] = "vanak";
    try {
      const prev = JSON.parse(window.localStorage.getItem("kidareh_presence_origin_v1") || "null") as PresenceOrigin | null;
      if (prev?.neighborhoodId && NEIGHBORHOODS.some((n) => n.id === prev.neighborhoodId)) {
        neighborhoodId = prev.neighborhoodId;
      }
    } catch {
      /* ignore */
    }
    const neighborhood = NEIGHBORHOODS.find((n) => n.id === neighborhoodId) ?? NEIGHBORHOODS[0];
    return {
      lat: neighborhood.center.lat,
      lng: neighborhood.center.lng,
      label: `${neighborhood.name}، تهران`,
      neighborhoodId: neighborhood.id,
    };
  }
  return {
    lat: location.lat,
    lng: location.lng,
    label: location.display,
  };
}

export function locationFromIranCity(city: IranCity, source: AppLocation["source"] = "manual"): AppLocation {
  return fromCity(city, source);
}

export function writeAppLocation(location: AppLocation) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(APP_CITY_KEY, JSON.stringify(location));
  window.localStorage.setItem(
    LEGACY_CITY_KEY,
    JSON.stringify({
      city: location.city,
      province: location.province,
      display: location.display,
    })
  );
  window.localStorage.setItem("kidareh_presence_origin_v1", JSON.stringify(originFromAppLocation(location)));
  window.dispatchEvent(new Event(APP_CITY_EVENT));
}

export function saveIranCity(city: IranCity, source: AppLocation["source"] = "manual") {
  writeAppLocation(fromCity(city, source));
}

export function onAppLocationChange(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (!event.key || event.key === APP_CITY_KEY || event.key === LEGACY_CITY_KEY) cb();
  };
  window.addEventListener(APP_CITY_EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(APP_CITY_EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAppLocation() {
  const [location, setLocation] = useState<AppLocation>(() => readAppLocation());
  const [pickerOpen, setPickerOpen] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => onAppLocationChange(() => setLocation(readAppLocation())), []);

  const selectCity = useCallback((city: IranCity, source: AppLocation["source"] = "manual") => {
    const next = fromCity(city, source);
    writeAppLocation(next);
    setLocation(next);
    setPickerOpen(false);
    setGpsError(null);
  }, []);

  const useGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("موقعیت مکانی در این مرورگر فعال نیست");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nearest = findNearestIranCity(pos.coords.latitude, pos.coords.longitude);
        setGpsLoading(false);
        if (!nearest) {
          setGpsError("شهر نزدیک پیدا نشد");
          return;
        }
        selectCity(nearest, "gps");
      },
      () => {
        setGpsLoading(false);
        setGpsError("اجازه موقعیت داده نشد — شهر را دستی انتخاب کنید");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [selectCity]);

  return {
    location,
    pickerOpen,
    setPickerOpen,
    selectCity,
    useGps,
    gpsError,
    gpsLoading,
    isTehran: isTehranCity(location.city),
  };
}
