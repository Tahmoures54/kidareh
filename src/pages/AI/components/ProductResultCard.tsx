import React from "react";
import { MapPin, Store, ShieldCheck, Phone, Navigation, PackageCheck } from "lucide-react";

export interface AIProductResult {
  id: number;
  name: string;
  price: number | string;
  status: string;
  store_name: string;
  store_phone?: string | null;
  distance?: number | null;
  city?: string | null;
  province?: string | null;
  rating?: number | null;
}

function formatPrice(price: number | string) {
  const value = Number(price);
  return Number.isFinite(value) ? `${new Intl.NumberFormat("fa-IR").format(Math.round(value))} تومان` : `${price} تومان`;
}

function distanceText(distance?: number | null) {
  if (distance == null || !Number.isFinite(distance)) return null;
  if (distance < 1000) return `${Math.round(distance)} متر`;
  return `${(distance / 1000).toFixed(1)} کیلومتر`;
}

export default React.memo(function ProductResultCard({ product }: { product: AIProductResult }) {
  const distance = distanceText(product.distance);
  const mapsUrl = product.store_name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${product.store_name}${product.city ? ` ${product.city}` : ""}`)}` : null;

  return (
    <article className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-black text-sm text-gray-900 dark:text-white truncate">{product.name}</h3>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            <Store className="w-3.5 h-3.5" />
            <span className="truncate">{product.store_name}</span>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="font-black text-sm text-violet-600 dark:text-violet-400">{formatPrice(product.price)}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
            <PackageCheck className="w-3 h-3" /> {product.status || "موجودی ثبت‌شده"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-gray-500 dark:text-gray-400">
        {distance && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance}</span>}
        {product.city && <span>{product.city}</span>}
        {product.rating != null && <span>★ {Number(product.rating).toFixed(1)}</span>}
        <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> داده فروشگاه</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {product.store_phone ? (
          <a href={`tel:${product.store_phone}`} className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-[10px] font-black text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800">
            <Phone className="w-3.5 h-3.5" /> تماس برای تأیید
          </a>
        ) : <div />}
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center gap-1.5 text-[10px] font-black hover:bg-violet-700">
            <Navigation className="w-3.5 h-3.5" /> مسیر فروشگاه
          </a>
        )}
      </div>
    </article>
  );
});
