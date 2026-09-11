import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_ORIGIN, NEIGHBORHOODS } from "../presence/catalog";
import type { PresenceOrigin } from "../presence/types";
import { useLocalStorage } from "./useLocalStorage";
import { isTehranCity } from "../data/processed/iranCities";
import { onAppLocationChange, readAppLocation } from "./useAppLocation";

export function usePresenceOrigin() {
  const [origin, setOrigin] = useLocalStorage<PresenceOrigin>("kidareh_presence_origin_v1", DEFAULT_ORIGIN);
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const loc = readAppLocation();
      if (isTehranCity(loc.city)) {
        setOrigin((prev) => {
          if (!prev.neighborhoodId && prev.label === "موقعیت فعلی شما") return prev;
          const neighborhood =
            NEIGHBORHOODS.find((n) => n.id === prev.neighborhoodId) ?? NEIGHBORHOODS[0];
          if (prev.neighborhoodId === neighborhood.id && prev.label === `${neighborhood.name}، تهران`) {
            return prev;
          }
          return {
            lat: neighborhood.center.lat,
            lng: neighborhood.center.lng,
            label: `${neighborhood.name}، تهران`,
            neighborhoodId: neighborhood.id,
          };
        });
        return;
      }
      setOrigin({
        lat: loc.lat,
        lng: loc.lng,
        label: loc.display,
      });
    };
    sync();
    return onAppLocationChange(sync);
  }, [setOrigin]);

  const neighborhood = useMemo(
    () => NEIGHBORHOODS.find((n) => n.id === origin.neighborhoodId) ?? NEIGHBORHOODS[0],
    [origin.neighborhoodId]
  );

  const setNeighborhood = useCallback(
    (id: (typeof NEIGHBORHOODS)[number]["id"]) => {
      const n = NEIGHBORHOODS.find((x) => x.id === id);
      if (!n) return;
      setOrigin({
        lat: n.center.lat,
        lng: n.center.lng,
        label: `${n.name}، تهران`,
        neighborhoodId: n.id,
      });
    },
    [setOrigin]
  );

  const useGps = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("موقعیت مکانی در این مرورگر فعال نیست");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsError(null);
        setOrigin({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: "موقعیت فعلی شما",
          neighborhoodId: undefined,
        });
      },
      () => setGpsError("اجازه موقعیت داده نشد — محله را دستی انتخاب کنید"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setOrigin]);

  return { origin, setOrigin, neighborhood, setNeighborhood, useGps, gpsError };
}
