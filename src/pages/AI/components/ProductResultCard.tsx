import React, { useState } from "react";
import { MapPin, Store, ShieldCheck, Phone, Navigation, PackageCheck, MessageCircle, Bookmark, Check, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { apiRequest } from "../../../utils/api";

export interface AIProductResult {
  id: number;
  name: string;
  price: number | string;
  status: string;
  store_name: string;
  store_phone?: string | null;
  store_user_id?: number | null;
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

interface Props {
  product: AIProductResult;
  selected?: boolean;
  onCompare?: (product: AIProductResult) => void;
}

export default React.memo(function ProductResultCard({ product, selected = false, onCompare }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const [busy, setBusy] = useState<"contact" | "reserve" | null>(null);
  const distance = distanceText(product.distance);
  const mapsUrl = product.store_name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${product.store_name}${product.city ? ` ${product.city}` : ""}`)}` : null;

  const openChat = async (reserve = false) => {
    if (!user) {
      navigate("/login", { state: { returnUrl: `/product/${product.id}` } });
      return;
    }
    if (!product.store_user_id || product.store_user_id === Number(user.id)) {
      navigate(`/product/${product.id}`);
      return;
    }
    setBusy(reserve ? "reserve" : "contact");
    try {
      const room = await apiRequest<{ roomId: string }>("/api/messages/rooms", {
        method: "POST",
        auth: true,
        body: { receiverId: product.store_user_id, productId: product.id },
      });

      if (reserve) {
        await apiRequest("/api/messages", {
          method: "POST",
          auth: true,
          body: {
            roomId: room.roomId,
            receiverId: product.store_user_id,
            productId: product.id,
            content: `سلام. لطفاً این کالا را برای من رزرو کنید: ${product.name} — ${formatPrice(product.price)}. لطفاً موجودی و شرایط تحویل را تأیید کنید.`,
          },
        });
      }
      navigate(`/chat/${room.roomId}?product=${product.id}`);
    } catch {
      navigate(`/product/${product.id}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className={`rounded-2xl border bg-white dark:bg-gray-900 p-3 shadow-sm transition-all ${selected ? "border-violet-500 ring-2 ring-violet-500/10" : "border-gray-200 dark:border-gray-700"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <button onClick={() => navigate(`/product/${product.id}`)} className="min-w-0 text-right flex-1" aria-label={`مشاهده ${product.name}`}>
              <h3 className="font-black text-sm text-gray-900 dark:text-white truncate">{product.name}</h3>
            </button>
            {onCompare && (
              <button onClick={() => onCompare(product)} className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border ${selected ? "bg-violet-600 border-violet-600 text-white" : "border-gray-200 dark:border-gray-700 text-gray-500"}`} title="مقایسه">
                {selected ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              </button>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
            <Store className="w-3.5 h-3.5" /><span className="truncate">{product.store_name}</span>
          </div>
        </div>
        <div className="text-left shrink-0">
          <div className="font-black text-sm text-violet-600 dark:text-violet-400">{formatPrice(product.price)}</div>
          <div className="mt-1 inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"><PackageCheck className="w-3 h-3" /> {product.status || "موجودی ثبت‌شده"}</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-bold text-gray-500 dark:text-gray-400">
        {distance && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {distance}</span>}
        {product.city && <span>{product.city}</span>}
        {product.rating != null && <span>★ {Number(product.rating).toFixed(1)}</span>}
        <span className="inline-flex items-center gap-1 text-emerald-600"><ShieldCheck className="w-3 h-3" /> داده فروشگاه</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button onClick={() => openChat(false)} disabled={busy !== null} className="h-9 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1.5 text-[10px] font-black text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50">
          {busy === "contact" ? <span>در حال اتصال...</span> : <><MessageCircle className="w-3.5 h-3.5" /> تماس با فروشنده</>}
        </button>
        <button onClick={() => openChat(true)} disabled={busy !== null || !product.store_user_id} className="h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center gap-1.5 text-[10px] font-black hover:bg-violet-700 disabled:opacity-50">
          {busy === "reserve" ? <span>در حال ارسال...</span> : <><Bookmark className="w-3.5 h-3.5" /> درخواست رزرو</>}
        </button>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        {product.store_phone ? (
          <a href={`tel:${product.store_phone}`} className="h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1 text-[9px] font-bold text-gray-600 dark:text-gray-300"><Phone className="w-3 h-3" /> تماس تلفنی</a>
        ) : <div />}
        {mapsUrl && <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1 text-[9px] font-bold text-gray-600 dark:text-gray-300"><Navigation className="w-3 h-3" /> مسیر</a>}
        <button onClick={() => navigate(`/product/${product.id}`)} className="h-8 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center gap-1 text-[9px] font-bold text-gray-600 dark:text-gray-300"><ExternalLink className="w-3 h-3" /> جزئیات</button>
      </div>
    </article>
  );
});
