import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { EnrichedListing, GeoPoint } from "../../presence/types";
import { formatCompactToman } from "../../presence/engine";

function pin(color: string, label?: string) {
  return L.divIcon({
    className: "presence-pin",
    html: `<div style="transform:translate(-50%,-100%)">
      <div style="background:${color};color:white;border-radius:999px;padding:6px 8px;font:800 11px Vazirmatn,sans-serif;box-shadow:0 8px 20px rgba(0,0,0,.2);white-space:nowrap">${label ?? "●"}</div>
      <div style="width:8px;height:8px;background:${color};margin:2px auto 0;border-radius:99px"></div>
    </div>`,
    iconSize: [0, 0],
  });
}

function isPoint(p: GeoPoint | undefined | null): p is GeoPoint {
  return Boolean(p && Number.isFinite(p.lat) && Number.isFinite(p.lng));
}

function FlyTo({ center }: { center: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    if (!isPoint(center)) return;
    map.invalidateSize();
    map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.7 });
  }, [center.lat, center.lng, map]);
  return null;
}

function InvalidateSize() {
  const map = useMap();
  useEffect(() => {
    const id = window.setTimeout(() => map.invalidateSize(), 80);
    return () => window.clearTimeout(id);
  }, [map]);
  return null;
}


interface ClusteredListingsProps {
  listings: EnrichedListing[];
  selectedId?: string;
}

/** نشانگرهای فروشگاه را در زوم‌های دور خوشه‌بندی می‌کند تا نقشه شلوغ نشود. */
function ClusteredListings({ listings, selectedId }: ClusteredListingsProps) {
  const map = useMap();

  useEffect(() => {
    const clusters = L.markerClusterGroup({
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      chunkedLoading: true,
      iconCreateFunction: (cluster) => {
        const count = cluster.getChildCount();
        return L.divIcon({
          className: "presence-cluster-icon",
          html: "<span style=\"display:flex;align-items:center;justify-content:center;width:42px;height:42px;border:3px solid white;border-radius:999px;background:#08a6a6;color:white;font:900 13px Vazirmatn,sans-serif;box-shadow:0 6px 20px rgba(8,166,166,.35)\">"
            + count.toLocaleString("fa-IR") + "</span>",
          iconSize: [42, 42],
        });
      },
    });

    for (const listing of listings) {
      const point = { lat: listing.store.lat, lng: listing.store.lng };
      if (!isPoint(point)) continue;

      const marker = L.marker([point.lat, point.lng], {
        title: listing.store.name,
        icon: pin(listing.id === selectedId ? "#d6a52b" : "#08a6a6", formatCompactToman(listing.price)),
        riseOnHover: true,
      });

      // متن popup با textContent ساخته می‌شود تا نام کالا/فروشگاه HTML اجرا نکند.
      const popup = document.createElement("div");
      popup.dir = "rtl";
      popup.className = "min-w-[160px] text-right";

      const storeName = document.createElement("p");
      storeName.className = "text-xs font-black";
      storeName.textContent = listing.store.name;

      const productName = document.createElement("p");
      productName.className = "mt-1 text-[11px]";
      productName.textContent = listing.name;

      const price = document.createElement("p");
      price.className = "mt-1 text-[11px] font-black";
      price.textContent = formatCompactToman(listing.price);

      const link = document.createElement("a");
      link.href = "/p/" + encodeURIComponent(listing.id);
      link.className = "mt-2 inline-block text-[11px] font-black";
      link.style.color = "#087f80";
      link.textContent = "جزئیات کالا";

      popup.append(storeName, productName, price, link);
      marker.bindPopup(popup, { maxWidth: 240, minWidth: 160 });
      clusters.addLayer(marker);
    }

    clusters.addTo(map);
    return () => {
      clusters.clearLayers();
      map.removeLayer(clusters);
    };
  }, [listings, map, selectedId]);

  return null;
}

interface Props {
  origin: GeoPoint;
  listings: EnrichedListing[];
  path?: GeoPoint[];
  height?: string;
  selectedId?: string;
  className?: string;
}

export default function PresenceMap({ origin, listings, path, height = "100%", selectedId, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const uniqueStores = useMemo(() => {
    const map = new Map<string, EnrichedListing>();
    for (const l of listings) {
      if (!isPoint({ lat: l.store.lat, lng: l.store.lng })) continue;
      const prev = map.get(l.storeId);
      if (!prev || l.price < prev.price) map.set(l.storeId, l);
    }
    return [...map.values()];
  }, [listings]);

  const center = isPoint(origin) ? origin : { lat: 35.757, lng: 51.4105 };
  const line = (path ?? []).filter(isPoint);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const sync = () => {
      if (el.clientWidth > 8 && el.clientHeight > 8) setReady(true);
    };
    sync();
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={["presence-map h-full w-full overflow-hidden", className].filter(Boolean).join(" ")} style={{ height }}>
      {!ready ? (
        <div className="h-full w-full animate-pulse bg-[#d9e2d6]" />
      ) : (
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={14}
          scrollWheelZoom
          className="h-full w-full"
          zoomControl
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <InvalidateSize />
          <FlyTo center={center} />
          <Marker position={[center.lat, center.lng]} icon={pin("#0a3d3a", "تو")} />
          {line.length > 1 && (
            <Polyline
              positions={line.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#00A693", weight: 4, opacity: 0.9 }}
            />
          )}
          <ClusteredListings listings={uniqueStores} selectedId={selectedId} />
        </MapContainer>
      )}
    </div>
  );
}
