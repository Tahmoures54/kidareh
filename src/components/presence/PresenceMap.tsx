import React, { useEffect, useMemo, useRef, useState } from "react";
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

interface Props {
  origin: GeoPoint;
  listings: EnrichedListing[];
  path?: GeoPoint[];
  height?: string;
  selectedId?: string;
}

export default function PresenceMap({ origin, listings, path, height = "100%", selectedId }: Props) {
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
    <div ref={wrapRef} className="presence-map h-full w-full overflow-hidden" style={{ height }}>
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
          {uniqueStores.map((l) => (
            <Marker
              key={l.storeId}
              position={[l.store.lat, l.store.lng]}
              icon={pin(l.id === selectedId ? "#e6b84f" : "#00A693", formatCompactToman(l.price))}
            >
              <Popup>
                <div dir="rtl" className="min-w-[160px] text-right">
                  <p className="text-xs font-black">{l.store.name}</p>
                  <p className="text-[11px]">{l.skuLabel}</p>
                  <p className="text-[11px] font-bold">{formatWalk(l.walkMinutes)}</p>
                  <Link to={`/p/${l.id}`} className="mt-1 inline-block text-[11px] font-black text-[var(--accent)]">
                    جزئیات کالا
                  </Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      )}
    </div>
  );
}
