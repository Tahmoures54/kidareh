import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Megaphone, BadgeCheck, ChevronLeft, RefreshCw } from "lucide-react";

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

interface SponsoredBannerProps {
  city: string;
}

// سرویس دریافت بنرها
const fetchBanners = async (
  city: string,
  signal?: AbortSignal
): Promise<BannerItem[]> => {
  const q = encodeURIComponent(city || "تهران");
  const response = await fetch(`/api/promotions/banners?city=${q}&limit=5`, {
    credentials: "include",
    signal,
  });
  if (!response.ok) throw new Error("Failed to fetch banners");
  const data = await response.json();
  return data.banners as BannerItem[];
};

export function SponsoredBanner({ city }: SponsoredBannerProps) {
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // استفاده از ref برای نگه‌داری AbortController تا بتوانیم لغو کنیم
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadBanners = useCallback(async () => {
    // لغو درخواست قبلی
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchBanners(city, controller.signal);
      setBanners(data);
      setIndex(0);
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError("خطا در دریافت بنرها");
      }
    } finally {
      // فقط اگر همین controller جاری باشد loading را false می‌کنیم
      if (abortControllerRef.current === controller) {
        setLoading(false);
      }
    }
  }, [city]);

  // اثر برای بارگذاری اولیه و تغییر city
  useEffect(() => {
    loadBanners();
    // پاک‌سازی: لغو درخواست در صورت unmount یا تغییر city
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadBanners]);

  // چرخش خودکار
  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const handleBannerClick = useCallback(() => {
    if (!banners.length) return;
    const current = banners[index] || banners[0];
    // ثبت کلیک
    fetch(`/api/promotions/banners/${current.id}/click`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    navigate(`/stores/${current.storeId}`);
  }, [banners, index, navigate]);

  if (loading) {
    return (
      <div className="px-4 mb-4">
        <div className="w-full h-[88px] rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 mb-4">
        <div className="w-full rounded-2xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between">
          <span className="text-xs font-bold text-rose-600">{error}</span>
          <button
            onClick={loadBanners}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-100 text-rose-700 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  if (!banners.length) return null;

  const current = banners[index] || banners[0];

  return (
    <div className="px-4 mb-4">
      <button
        type="button"
        onClick={handleBannerClick}
        className="relative w-full overflow-hidden rounded-2xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-l from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/30 text-right shadow-sm active:scale-[0.99] transition-transform"
      >
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold">
          <Megaphone className="w-3 h-3" />
          آگهی
        </div>

        <div className="flex items-stretch gap-3 p-3 min-h-[88px]">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-200 dark:bg-gray-800 shrink-0">
            {current.imageUrl ? (
              <img
                src={current.imageUrl}
                alt={current.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl">
                🏪
              </div>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">
                {current.title}
              </h3>
              {(current.verified || current.blueTick) && (
                <BadgeCheck className="w-4 h-4 text-sky-500 shrink-0" />
              )}
            </div>
            {current.category && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {current.category} · {current.city}
              </p>
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
                className={`h-1 rounded-full transition-all ${
                  i === index
                    ? "w-4 bg-amber-500"
                    : "w-1.5 bg-amber-300/60"
                }`}
              />
            ))}
          </div>
        )}
      </button>
    </div>
  );
}

export default SponsoredBanner;
