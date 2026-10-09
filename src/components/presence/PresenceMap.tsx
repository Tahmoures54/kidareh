import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import type { EnrichedListing, GeoPoint } from "../../presence/types";
import { formatCompactToman, formatWalk } from "../../presence/engine";
import { clusterStores } from "../../presence/clustering";

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


function ZoomWatcher({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const updateZoom = () => onZoomChange(map.getZoom());
    updateZoom();
    map.on("zoomend", updateZoom);
    return () => { map.off("zoomend", updateZoom); };
  }, [map, onZoomChange]);
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
  className?: string;
}

export default function PresenceMap({ origin, listings, path, height = "100%", selectedId, className }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(14);
  const uniqueStores = useMemo(() => {
    const map = new Map<string, EnrichedListing>();
    for (const l of listings) {
      if (!isPoint({ lat: l.store.lat, lng: l.store.lng })) continue;
      const prev = map.get(l.storeId);
      if (!prev || l.price < prev.price) map.set(l.storeId, l);
    }
    return [...map.values()];
  }, [listings]);

  const clusterGroups = useMemo(() => clusterStores(uniqueStores, zoom), [uniqueStores, zoom]);

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
          <ZoomWatcher onZoomChange={setZoom} />
          <FlyTo center={center} />
          <Marker position={[center.lat, center.lng]} icon={pin("#0a3d3a", "تو")} />
          {line.length > 1 && (
            <Polyline
              positions={line.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{ color: "#00A693", weight: 4, opacity: 0.9 }}
            />
          )}
          {clusterGroups.map((cluster) => {
            if (cluster.items.length === 1) {
              const listing = cluster.items[0];
              if (!listing) return null;
              return (
                <Marker
                  key={listing.storeId}
                  position={[listing.store.lat, listing.store.lng]}
                  icon={pin(listing.id === selectedId ? "#e6b84f" : "#08a6a6", formatCompactToman(listing.price))}
                >
                  <Popup>
                    <div dir="rtl" className="min-w-[160px] text-right">
                      <p className="text-xs font-black">{listing.store.name}</p>
                      <p className="text-[11px]">{listing.skuLabel}</p>
                      <p className="text-[11px] font-bold">{formatWalk(listing.walkMinutes)}</p>
                      <Link to={`/p/${listing.id}`} className="mt-1 inline-block text-[11px] font-black text-[var(--accent)]">
                        جزئیات کالا
                      </Link>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return (
              <Marker
                key={`cluster-${cluster.key}`}
                position={[cluster.center.lat, cluster.center.lng]}
                icon={pin("#087f8c", `${cluster.items.length} فروشگاه`)}
              >
                <Popup>
                  <div dir="rtl" className="max-h-64 min-w-[190px] space-y-2 overflow-y-auto text-right">
                    <p className="text-xs font-black text-teal-800">{cluster.items.length} فروشگاه در این محدوده</p>
                    {cluster.items.slice(0, 8).map((listing) => (
                      <Link key={listing.storeId} to={`/p/${listing.id}`} className="block rounded-xl bg-slate-50 p-2 hover:bg-teal-50">
                        <span className="block text-xs font-black">{listing.store.name}</span>
                        <span className="mt-1 block text-[11px] font-bold text-slate-500">{listing.skuLabel} · {formatCompactToman(listing.price)}</span>
                      </Link>
                    ))}
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      )}
    </div>
  );
}
