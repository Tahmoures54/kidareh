// src/hooks/useGeolocation.ts
import { useEffect, useState, useCallback, useRef } from "react";
import { iranCities, type IranCity } from "@data/processed/iranCities";

/* ====================== TYPES ====================== */

interface UseGeolocationReturn {
  city: string;
  province: string;
  displayLocation: string;
  gpsEnabled: boolean;
  loading: boolean;
  error: string | null;
  requestLocationPermission: () => void;
  clearCache: () => void;
}

type CachedGeo = {
  city: string;
  province: string;
  displayLocation: string;
  gpsEnabled: boolean;
  timestamp: number;
};

/* ====================== CONSTANTS ====================== */

const GEO_CACHE_KEY = "kidareh_geo_cache_v2";
const GEO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const GEO_TIMEOUT = 8000; // 8 seconds
const GEO_REQUEST_TIMEOUT = 10000; // 10 seconds fallback

/* ====================== UTILITY FUNCTIONS ====================== */

/**
 * محاسبه فاصله بین دو نقطه جغرافیایی (Haversine Formula)
 */
function getDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // شعاع زمین به کیلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * یافتن نزدیک‌ترین شهر به مختصات
 */
function findNearestCity(lat: number, lng: number): IranCity | null {
  let nearest: IranCity | null = null;
  let minDistance = Infinity;

  for (const city of iranCities) {
    const distance = getDistance(lat, lng, city.lat, city.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = city;
    }
  }

  return nearest;
}

/**
 * خواندن کش از sessionStorage
 */
function readGeoCache(): CachedGeo | null {
  if (typeof sessionStorage === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedGeo;
    if (!parsed?.timestamp) return null;

    // بررسی اینکه کش منقضی نشده باشد
    const isFresh = Date.now() - parsed.timestamp < GEO_CACHE_TTL;
    return isFresh ? parsed : null;
  } catch (error) {
    console.warn("Failed to read geo cache:", error);
    return null;
  }
}

/**
 * ذخیره کش در sessionStorage
 */
function writeGeoCache(data: Omit<CachedGeo, "timestamp">): void {
  if (typeof sessionStorage === "undefined") return;

  try {
    const payload: CachedGeo = { ...data, timestamp: Date.now() };
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn("Failed to write geo cache:", error);
  }
}

/**
 * حذف کش
 */
function clearGeoCache(): void {
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(GEO_CACHE_KEY);
  }
}

/**
 * ترجمه خطاهای Geolocation API
 */
function getErrorMessage(code: number): string {
  switch (code) {
    case 1: // PERMISSION_DENIED
      return "دسترسی به موقعیت مکانی رد شد";
    case 2: // POSITION_UNAVAILABLE
      return "موقعیت مکانی در دسترس نیست";
    case 3: // TIMEOUT
      return "زمان دریافت موقعیت به پایان رسید";
    default:
      return "خطای نامشخص در دریافت موقعیت";
  }
}

/* ====================== HOOK ====================== */

export function useGeolocation(
  fallbackCity: string = "تهران"
): UseGeolocationReturn {
  // Fallback City Info
  const fallbackMatched = iranCities.find((c) => c.name === fallbackCity);
  const fallbackProvince = fallbackMatched?.province || "تهران";

  // State
  const [city, setCity] = useState<string>(fallbackCity);
  const [province, setProvince] = useState<string>(fallbackProvince);
  const [displayLocation, setDisplayLocation] = useState<string>(
    `${fallbackCity}، ${fallbackProvince}`
  );
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Refs برای جلوگیری از تنظیمات مکرر
  const isMountedRef = useRef<boolean>(true);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, []);

  // تابع برای تنظیم state به صورت ایمن
  const updateState = useCallback(
    (newState: Partial<UseGeolocationReturn>) => {
      if (!isMountedRef.current) return;

      setCity((prev) => newState.city ?? prev);
      setProvince((prev) => newState.province ?? prev);
      setDisplayLocation((prev) => newState.displayLocation ?? prev);
      setGpsEnabled((prev) => newState.gpsEnabled ?? prev);
      setLoading((prev) => newState.loading ?? prev);
      setError((prev) => newState.error ?? prev);
    },
    []
  );

  // درخواست مجدد Location Permission
  const requestLocationPermission = useCallback(() => {
    clearGeoCache();
    setLoading(true);
    setError(null);
  }, []);

  // درخواست موقعیت
  const requestGeolocation = useCallback(() => {
    // بررسی کش
    const cached = readGeoCache();
    if (cached && isMountedRef.current) {
      updateState({
        city: cached.city,
        province: cached.province,
        displayLocation: cached.displayLocation,
        gpsEnabled: cached.gpsEnabled,
        loading: false,
        error: null,
      });
      return;
    }

    // بررسی پشتیبانی Geolocation
    if (!("geolocation" in navigator)) {
      updateState({
        city: fallbackCity,
        province: fallbackProvince,
        displayLocation: `${fallbackCity}، ${fallbackProvince}`,
        gpsEnabled: false,
        loading: false,
        error: "موقعیت‌یاب در مرورگر شما پشتیبانی نمی‌شود",
      });
      return;
    }

    // تایمر فیلبک
    timeoutIdRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      updateState({
        city: fallbackCity,
        province: fallbackProvince,
        displayLocation: `${fallbackCity}، ${fallbackProvince}`,
        gpsEnabled: false,
        loading: false,
        error: "زمان دریافت موقعیت به پایان رسید",
      });
    }, GEO_REQUEST_TIMEOUT);

    // درخواست موقعیت
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }

        if (!isMountedRef.current) return;

        const { latitude, longitude } = position.coords;
        const nearest = findNearestCity(latitude, longitude);

        if (nearest) {
          const finalCity = nearest.name;
          const finalProvince = nearest.province;
          const finalDisplay = `${finalCity}، ${finalProvince}`;

          updateState({
            city: finalCity,
            province: finalProvince,
            displayLocation: finalDisplay,
            gpsEnabled: true,
            loading: false,
            error: null,
          });

          writeGeoCache({
            city: finalCity,
            province: finalProvince,
            displayLocation: finalDisplay,
            gpsEnabled: true,
          });
        } else {
          updateState({
            city: fallbackCity,
            province: fallbackProvince,
            displayLocation: `${fallbackCity}، ${fallbackProvince}`,
            gpsEnabled: false,
            loading: false,
            error: "شهر نزدیک پیدا نشد",
          });
        }
      },
      (err) => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }

        if (!isMountedRef.current) return;

        updateState({
          city: fallbackCity,
          province: fallbackProvince,
          displayLocation: `${fallbackCity}، ${fallbackProvince}`,
          gpsEnabled: false,
          loading: false,
          error: getErrorMessage(err.code),
        });
      },
      {
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT,
        maximumAge: GEO_CACHE_TTL,
      }
    );
  }, [fallbackCity, fallbackProvince, updateState]);

  // اجرا درخواست موقعیت
  useEffect(() => {
    requestGeolocation();

    return () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
      }
    };
  }, [requestGeolocation]);

  return {
    city,
    province,
    displayLocation,
    gpsEnabled,
    loading,
    error,
    requestLocationPermission,
    clearCache: clearGeoCache,
  };
}