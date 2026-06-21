import { useEffect, useState } from "react";
import { iranCities, type IranCity } from "../data/iranCities";

interface UseGeolocationReturn {
  city: string;
  province: string;
  displayLocation: string;
  gpsEnabled: boolean;
  loading: boolean;
  error: string | null;
}

type CachedGeo = {
  city: string;
  province: string;
  displayLocation: string;
  gpsEnabled: boolean;
  timestamp: number;
};

const GEO_CACHE_KEY = "kidareh_geo_cache_v1";
const GEO_CACHE_TTL = 5 * 60 * 1000; // 5 دقیقه

// محاسبه فاصله بین دو نقطه جغرافیایی (Haversine)
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // کیلومتر
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

// نزدیک‌ترین شهر از دیتاست داخلی
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

function readGeoCache(): CachedGeo | null {
  try {
    const raw = sessionStorage.getItem(GEO_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedGeo;
    if (!parsed?.timestamp) return null;

    const isFresh = Date.now() - parsed.timestamp < GEO_CACHE_TTL;
    return isFresh ? parsed : null;
  } catch {
    return null;
  }
}

function writeGeoCache(data: Omit<CachedGeo, "timestamp">) {
  try {
    const payload: CachedGeo = { ...data, timestamp: Date.now() };
    sessionStorage.setItem(GEO_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function useGeolocation(fallbackCity = "تهران"): UseGeolocationReturn {
  const fallbackMatched = iranCities.find((c) => c.name === fallbackCity);
  const fallbackProvince = fallbackMatched?.province || "تهران";

  const [city, setCity] = useState<string>(fallbackCity);
  const [province, setProvince] = useState<string>(fallbackProvince);
  const [displayLocation, setDisplayLocation] = useState<string>("در حال یافتن موقعیت...");
  const [gpsEnabled, setGpsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1) اول cache سریع
    const cached = readGeoCache();
    if (cached) {
      setCity(cached.city);
      setProvince(cached.province);
      setDisplayLocation(cached.displayLocation);
      setGpsEnabled(cached.gpsEnabled);
      setLoading(false);
      setError(null);
      return;
    }

    // 2) اگر مرورگر geolocation نداشت
    if (!("geolocation" in navigator)) {
      setCity(fallbackCity);
      setProvince(fallbackProvince);
      setDisplayLocation(`${fallbackCity}، ${fallbackProvince}`);
      setGpsEnabled(false);
      setLoading(false);
      setError("موقعیت‌یاب در مرورگر شما پشتیبانی نمی‌شود");
      return;
    }

    let finished = false;
    const finishSafely = (fn: () => void) => {
      if (finished) return;
      finished = true;
      fn();
    };

    const timeoutId = window.setTimeout(() => {
      finishSafely(() => {
        setCity(fallbackCity);
        setProvince(fallbackProvince);
        setDisplayLocation(`${fallbackCity}، ${fallbackProvince}`);
        setGpsEnabled(false);
        setLoading(false);
        setError("زمان دریافت موقعیت به پایان رسید");
      });
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);

        finishSafely(() => {
          const { latitude, longitude } = position.coords;
          const nearest = findNearestCity(latitude, longitude);

          if (nearest) {
            const finalCity = nearest.name;
            const finalProvince = nearest.province;
            const finalDisplay = `${finalCity}، ${finalProvince}`;

            setCity(finalCity);
            setProvince(finalProvince);
            setDisplayLocation(finalDisplay);
            setGpsEnabled(true);
            setError(null);
            setLoading(false);

            writeGeoCache({
              city: finalCity,
              province: finalProvince,
              displayLocation: finalDisplay,
              gpsEnabled: true,
            });
          } else {
            setCity(fallbackCity);
            setProvince(fallbackProvince);
            setDisplayLocation(`${fallbackCity}، ${fallbackProvince}`);
            setGpsEnabled(false);
            setError("شهر نزدیک پیدا نشد");
            setLoading(false);
          }
        });
      },
      (err) => {
        window.clearTimeout(timeoutId);

        finishSafely(() => {
          setCity(fallbackCity);
          setProvince(fallbackProvince);
          setDisplayLocation(`${fallbackCity}، ${fallbackProvince}`);
          setGpsEnabled(false);
          setLoading(false);

          switch (err.code) {
            case err.PERMISSION_DENIED:
              setError("دسترسی به موقعیت مکانی رد شد");
              break;
            case err.POSITION_UNAVAILABLE:
              setError("موقعیت مکانی در دسترس نیست");
              break;
            case err.TIMEOUT:
              setError("زمان دریافت موقعیت به پایان رسید");
              break;
            default:
              setError("خطای نامشخص در دریافت موقعیت");
          }
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: GEO_CACHE_TTL,
      }
    );

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [fallbackCity, fallbackProvince]);

  return { city, province, displayLocation, gpsEnabled, loading, error };
}