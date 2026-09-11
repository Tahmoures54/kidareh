import React, { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import type { EnrichedListing, GeoPoint } from "../../presence/types";
import { formatCompactToman, formatWalk } from "../../presence/engine";

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

function FlyTo({ center }: { center: GeoPoint }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([center.lat, center.lng], map.getZoom(), { duration: 0.7 });
  }, [center.lat, center.lng, map]);
  return null;
}

interface Props {
  origin: GeoPoint;
  listings: EnrichedListing[];
  path?: GeoPoint[];
  height?: string;
  selectedId?: string;
}

export default function PresenceMap({ origin, listings, path, height = "100%", selectedId }: Props) {
  const [ready, setReady] = useState(false);
  const uniqueStores = useMemo(() => {
    const map = new Map<string, EnrichedListing>();
    for (const l of listings) {
      const prev = map.get(l.storeId);
      if (!prev || l.price < prev.price) map.set(l.storeId, l);
    }
    return [...map.values()];
  }, [listings]);

  useEffect(() => setReady(true), []);
  if (!ready) return <div className="h-full w-full animate-pulse bg-[#d9e2d6]" />;

  return (
    <div className="presence-map h-full w-full overflow-hidden" style={{ height }}>
      <MapContainer
        center={[origin.lat, origin.lng]}
        zoom={14}
        scrollWheelZoom
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; OSM'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FlyTo center={origin} />
        <Marker position={[origin.lat, origin.lng]} icon={pin("#2563eb", "تو")} />
        {path && path.length > 1 && (
          <Polyline
            positions={path.map((p) => [p.lat, p.lng] as [number, number])}
            pathOptions={{ color: "#0e6f63", weight: 4, opacity: 0.85 }}
          />
        )}
        {uniqueStores.map((l) => (
          <Marker
            key={l.storeId}
            position={[l.store.lat, l.store.lng]}
            icon={pin(l.id === selectedId ? "#b68a3a" : "#0e6f63", formatCompactToman(l.price))}
          >
            <Popup>
              <div dir="rtl" className="min-w-[160px] text-right">
                <p className="text-xs font-black">{l.store.name}</p>
                <p className="text-[11px]">{l.skuLabel}</p>
                <p className="text-[11px] font-bold">{formatWalk(l.walkMinutes)}</p>
                <Link to={`/p/${l.id}`} className="mt-1 inline-block text-[11px] font-black text-teal-700">
                  جزئیات کالا
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
