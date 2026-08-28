// src/components/Map.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Link } from 'react-router-dom';
import { Crosshair, Store } from 'lucide-react';
import { motion } from 'motion/react';

// ═══════════════════════════════════════════
// Custom Leaflet DivIcons (no external images)
// ═══════════════════════════════════════════

const userIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div class="relative flex items-center justify-center w-10 h-10 -ml-5 -mt-5">
      <div class="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-40"></div>
      <div class="absolute inset-2 bg-blue-100 rounded-full opacity-60"></div>
      <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-[0_0_10px_rgba(37,99,235,0.8)]"></div>
    </div>
  `,
  iconSize: [0, 0],
});

const createStoreIcon = (isHighlight = false) =>
  L.divIcon({
    className: 'custom-store-marker',
    html: `
      <div class="relative group cursor-pointer -ml-4 -mt-8">
        <div class="w-8 h-8 ${
          isHighlight ? 'bg-rose-500' : 'bg-indigo-600'
        } rounded-t-full rounded-bl-full rotate-45 flex items-center justify-center shadow-lg border-2 border-white transition-transform group-hover:scale-110 group-hover:shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="-rotate-45">
            <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7"/>
          </svg>
        </div>
        <div class="w-1.5 h-1.5 bg-black/20 rounded-full mx-auto mt-0.5 blur-[1px]"></div>
      </div>
    `,
    iconSize: [0, 0],
  });

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface Location {
  lat: number;
  lng: number;
}

export interface ProductResult {
  id: string | number;
  name: string;
  price: number | string;
  store: string;
  image?: string;
  latitude?: number;
  longitude?: number;
  distance?: string;
  badge?: string;
}

interface MapProps {
  center: Location;
  results: ProductResult[];
  height?: string;
}

// ═══════════════════════════════════════════
// Map Controller (zoom animation)
// ═══════════════════════════════════════════

const MapController = React.memo(function MapController({
  center,
  zoomTrigger,
}: {
  center: Location;
  zoomTrigger: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (zoomTrigger > 0) {
      map.flyTo([center.lat, center.lng], 15, {
        duration: 1.5,
        easeLinearity: 0.25,
      });
    }
  }, [center, zoomTrigger, map]);

  return null;
});

// ═══════════════════════════════════════════
// Main Map Component
// ═══════════════════════════════════════════

function Map({ center, results, height = '65vh' }: MapProps) {
  const [zoomTrigger, setZoomTrigger] = useState(0);

  const handleLocateMe = useCallback(() => {
    setZoomTrigger((prev) => prev + 1);
  }, []);

  // Helper to get lat/lng (with fallback for missing data)
  const getPosition = (result: ProductResult, index: number): [number, number] => {
    if (result.latitude != null && result.longitude != null) {
      return [result.latitude, result.longitude];
    }
    // Spread results around the center if coordinates are missing
    const offset = (index + 1) * 0.01;
    return [
      center.lat + Math.sin(index) * offset,
      center.lng + Math.cos(index) * offset,
    ];
  };

  return (
    <div
      className="relative w-full rounded-[2rem] overflow-hidden border border-gray-200/60 shadow-lg bg-gray-50 z-0"
      style={{ height }}
    >
      {/* Floating locate button */}
      <div className="absolute bottom-6 left-4 z-[400]">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleLocateMe}
          className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl border border-white/50"
          aria-label="مکان من"
        >
          <Crosshair className="w-6 h-6" />
        </motion.button>
      </div>

      <MapContainer
        center={[center.lat, center.lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapController center={center} zoomTrigger={zoomTrigger} />

        <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />

        {/* User location marker */}
        <Marker position={[center.lat, center.lng]} icon={userIcon}>
          <Popup closeButton={false}>
            <div className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shadow-lg">
              شما اینجا هستید
            </div>
          </Popup>
        </Marker>

        {/* Store / product markers */}
        {results.map((result, index) => {
          const [lat, lng] = getPosition(result, index);
          return (
            <Marker
              key={result.id}
              position={[lat, lng]}
              icon={createStoreIcon(!!result.badge)}
            >
              <Popup closeButton={false}>
                <div className="w-[200px] flex flex-col p-1" dir="rtl">
                  {/* Thumbnail */}
                  <div className="w-full h-24 rounded-xl overflow-hidden mb-2 bg-gray-50 relative">
                    <img
                      src={
                        result.image ||
                        `https://picsum.photos/seed/${result.id}/200/100`
                      }
                      alt={result.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    {result.badge && (
                      <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
                        {result.badge}
                      </span>
                    )}
                  </div>

                  <div className="px-1">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-1 font-bold">
                      <Store className="w-3 h-3 text-indigo-400" />
                      <span className="truncate">{result.store}</span>
                    </div>

                    <h3 className="font-black text-gray-900 text-xs mb-1 line-clamp-2 leading-tight">
                      {result.name}
                    </h3>

                    <p className="text-sm font-black text-indigo-600 mb-3 mt-2">
                      {typeof result.price === 'number'
                        ? result.price.toLocaleString('fa-IR')
                        : result.price}{' '}
                      <span className="text-[9px] text-gray-400">تومان</span>
                    </p>

                    <Link
                      to={`/product/${result.id}`}
                      className="block w-full bg-gray-900 text-white text-center py-2.5 rounded-xl text-xs font-black hover:bg-black transition-colors"
                    >
                      مشاهده کالا
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default React.memo(Map);
