import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, BadgeCheck, ChevronLeft } from "lucide-react";

interface BannerItem {
  id: number;
  storeId: number;
  title: string;
  imageUrl?: string | null;
  city: string;
  category?: string;
  verified?: boolean;
  blueTick?: boolean;
  isAd: boolean;
}

/**
 * Homepage sponsored stores — labeled "آگهی" (psych analysis: tangible visibility for sellers)
 */
export function SponsoredBanner({ city }: { city: string }) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const q = encodeURIComponent(city || "تهران");
    fetch(`/api/promotions/banners?city=${q}&limit=5`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data.banners)) setBanners(data.banners);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [city]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (!banners.length) return null;

  const b = banners[index] || banners[0];

  const onClick = () => {
    fetch(`/api/promotions/banners/${b.id}/click`, { method: "POST", credentials: "include" }).catch(() => {});
    navigate(`/stores/${b.storeId}`);
  };

  return (
    <div className="px-4 mb-4">
      <button
        type="button"
        onClick={onClick}
        className="relative w-full overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 text-right shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
          <Megaphone className="w-3 h-3" />
          آگهی
        </div>

        <div className="flex items-stretch gap-3 p-3 min-h-[88px]">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
            {b.imageUrl ? (
              <img src={b.imageUrl} alt={b.title} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">🏪</div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{b.title}</h3>
              {(b.verified || b.blueTick) && (
                <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
              )}
            </div>
            {b.category && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{b.category} · {b.city}</p>
            )}
            <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 font-medium">
              فروشگاه پیشنهادی محله شما
            </p>
          </div>

          <div className="flex items-center text-amber-600">
            <ChevronLeft className="w-5 h-5" />
          </div>
        </div>

        {banners.length > 1 && (
          <div className="flex justify-center gap-1 pb-2">
            {banners.map((_, i) => (
              <span
                key={i}
                className={`h-1 rounded-full transition-all ${i === index ? "w-4 bg-amber-500" : "w-1.5 bg-amber-300/60"}`}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

export default SponsoredBanner;
