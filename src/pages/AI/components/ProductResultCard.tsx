import React from "react";
import { MapPin, Store, ShieldCheck, Phone, Navigation, PackageCheck, MessageCircle, GitCompare, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface AIProductResult {
  id: number;
  name: string;
  price: number | string;
  status: string;
  store_name: string;
  store_user_id?: number | string | null;
  store_phone?: string | null;
  distance?: number | null;
  city?: string | null;
  province?: string | null;
  rating?: number | null;
  decision?: { score: number; reasons: string[] };
}

function formatPrice(price: number | string) {
  const value = Number(price);
  return Number.isFinite(value) ? `${new Intl.NumberFormat("fa-IR").format(Math.round(value))} تومان` : `${price} تومان`;
}

function distanceText(distance?: number | null) {
  if (distance == null || !Number.isFinite(Number(distance))) return null;
  return Number(distance) < 1000 ? `${Math.round(Number(distance))} متر` : `${(Number(distance) / 1000).toFixed(1)} کیلومتر`;
}

export default React.memo(function ProductResultCard({ product, selected, onToggleCompare }: { product: AIProductResult; selected?: boolean; onToggleCompare?: () => void }) {
  const navigate = useNavigate();
  const distance = distanceText(product.distance);
  const mapsUrl = product.store_name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${product.store_name}${product.city ? ` ${product.city}` : ""}`)}` : null;
  const score = product.decision?.score;
  const chatUrl = product.store_user_id ? `/chat/${product.store_user_id}?product=${product.id}` : null;

  return (
    <article className={`rounded-2xl border bg-white dark:bg-gray-900 p-3 shadow-sm transition-all ${selected ? "border-violet-500 ring-2 ring-violet-500/10" : "border-gray-200 dark:border-gray-700"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex items-center gap-2"><h3 className="font-black text-sm text-gray-900 dark:text-white truncate">{product.name}</h3>{score != null && <span className="shrink-0 rounded-full bg-violet-50 dark:bg-violet-500/10 px-2 py-1 text-[9px] font-black text-violet-700 dark:text-violet-300">{score}/100</span>}</div><div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400"><Store className="w-3.5 h-3.5" /><span className="truncate">{product.store_name}</span></div></div>
        <div className="text-left shrink-0"><div className="font-black text-sm text-violet-600 dark:text-violet-400">{formatPrice(product.price)}</div><div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"><PackageCheck className="w-3 h-3" /> {product.status || "موجودی ثبت‌شده"}</div></div>
      </div>
      {product.decision?.reasons?.length ? <div className="mt-2 flex flex-wrap gap-1.5">{product.decision.reasons.slice(0, 3).map(reason => <span key={reason} className="rounded-full bg-gray-50 dark:bg-gray-800 px-2 py-1 text-[9px] font-bold text-gray-600 dark:text-gray-300">✓ {reason}</span>)}</div> : null}
      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-gray-500 dark:text-gray-400">{distance && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance}</span>}{product.city && <span>{product.city}</span>}{product.rating != null && <span>★ {Number(product.rating).toFixed(1)}</span>}<span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> داده فروشگاه</span></div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => navigate(`/product/${product.id}`)} className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-[10px] font-black text-gray-700 dark:text-gray-200"><Eye className="w-3.5 h-3.5" /> مشاهده کالا</button>
        {onToggleCompare && <button onClick={onToggleCompare} className={`h-9 rounded-xl flex items-center justify-center gap-1.5 text-[10px] font-black ${selected ? "bg-violet-600 text-white" : "border border-violet-200 dark:border-violet-900/50 text-violet-700 dark:text-violet-300"}`}><GitCompare className="w-3.5 h-3.5" /> {selected ? "حذف از مقایسه" : "مقایسه"}</button>}
        {product.store_phone ? <a href={`tel:${product.store_phone}`} className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-[10px] font-black text-gray-700 dark:text-gray-200"><Phone className="w-3.5 h-3.5" /> تماس</a> : <div />}
        {chatUrl && <button onClick={() => navigate(chatUrl)} className="h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center gap-1.5 text-[10px] font-black"><MessageCircle className="w-3.5 h-3.5" /> گفت‌وگو</button>}
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="col-span-2 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center gap-1.5 text-[10px] font-black"><Navigation className="w-3.5 h-3.5" /> مسیر فروشگاه</a>}
      </div>
    </article>
  );
});
