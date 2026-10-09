import { useEffect, useMemo } from "react";
import L from "leaflet";
import "leaflet.markercluster";
import { useMap } from "react-leaflet";
import type { EnrichedListing } from "../../presence/types";
import { formatCompactToman, formatWalk } from "../../presence/engine";

interface MarkerClusterLayerProps {
  listings: EnrichedListing[];
  selectedId?: string;
}

function createPopup(listing: EnrichedListing): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.dir = "rtl";
  wrapper.className = "min-w-[160px] text-right";

  const store = document.createElement("p");
  store.className = "text-xs font-black";
  store.textContent = listing.store.name;

  const title = document.createElement("p");
  title.className = "text-[11px]";
  title.textContent = listing.skuLabel;

  const walk = document.createElement("p");
  walk.className = "text-[11px] font-bold";
  walk.textContent = formatWalk(listing.walkMinutes);

  const link = document.createElement("a");
  link.href = `/p/${encodeURIComponent(listing.id)}`;
  link.className = "mt-1 inline-block text-[11px] font-black text-teal-700";
  link.textContent = "جزئیات کالا";

  wrapper.append(store, title, walk, link);
  return wrapper;
}

/** مارکرهای فروشگاه را در خوشه‌های قابل کلیک گروه‌بندی می‌کند. */
export default function MarkerClusterLayer({ listings, selectedId }: MarkerClusterLayerProps) {
  const map = useMap();
  const clusterGroup = useMemo(
    () =>
      L.markerClusterGroup({
        maxClusterRadius: 48,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        spiderfyOnMaxZoom: true,
        removeOutsideVisibleBounds: true,
        iconCreateFunction: (cluster) =>
          L.divIcon({
            className: "presence-cluster",
            html: `<span style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border:3px solid white;border-radius:9999px;background:#08a6a6;color:white;font:900 12px Vazirmatn,sans-serif;box-shadow:0 8px 24px rgba(15,23,42,.24)">${cluster.getChildCount()}</span>`,
            iconSize: [42, 42],
            iconAnchor: [21, 21],
          }),
      }),
    [],
  );

  useEffect(() => {
    clusterGroup.addTo(map);
    return () => {
      clusterGroup.clearLayers();
      clusterGroup.removeFrom(map);
    };
  }, [clusterGroup, map]);

  useEffect(() => {
    clusterGroup.clearLayers();
    for (const listing of listings) {
      if (!Number.isFinite(listing.store.lat) || !Number.isFinite(listing.store.lng)) continue;
      const marker = L.marker([listing.store.lat, listing.store.lng], {
        icon: L.divIcon({
          className: "presence-pin",
          html: `<div style="transform:translate(-50%,-100%)"><div style="background:${listing.id === selectedId ? "#e6b84f" : "#08a6a6"};color:white;border-radius:999px;padding:6px 8px;font:800 11px Vazirmatn,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.2);white-space:nowrap">${formatCompactToman(listing.price)}</div><div style="width:8px;height:8px;background:${listing.id === selectedId ? "#e6b84f" : "#08a6a6"};margin:2px auto 0;border-radius:99px"></div></div>`,
          iconSize: [0, 0],
        }),
      });
      marker.bindPopup(createPopup(listing));
      clusterGroup.addLayer(marker);
    }
  }, [clusterGroup, listings, selectedId]);

  return null;
}
