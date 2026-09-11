import { useCallback, useMemo, useState } from "react";
import { DEFAULT_ORIGIN, NEIGHBORHOODS } from "../presence/catalog";
import type { PresenceOrigin } from "../presence/types";
import { useLocalStorage } from "./useLocalStorage";

export function usePresenceOrigin() {
  const [origin, setOrigin] = useLocalStorage<PresenceOrigin>("kidareh_presence_origin_v1", DEFAULT_ORIGIN);
  const [gpsError, setGpsError] = useState<string | null>(null);

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
        });
      },
      () => setGpsError("اجازه موقعیت داده نشد — محله را دستی انتخاب کنید"),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, [setOrigin]);

  return { origin, setOrigin, neighborhood, setNeighborhood, useGps, gpsError };
}
