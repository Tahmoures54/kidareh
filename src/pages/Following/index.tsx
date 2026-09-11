import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, RefreshCw, Store, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { ProductCard } from "../../components/cards/ProductCard";
import EmptyState from "../../components/ui/EmptyState";

interface FollowedStore {
  id: number;
  name: string;
  category?: string;
  image_url?: string | null;
  city?: string;
  product_count?: number;
  follower_count?: number;
}

function normalizeProduct(raw: any) {
  const images = raw.images
    ? typeof raw.images === "string"
      ? (() => {
          try {
            return JSON.parse(raw.images);
          } catch {
            return [raw.images];
          }
        })()
      : raw.images
    : [];
  const image =
    raw.image ||
    raw.image_url ||
    (Array.isArray(images) && images[0]) ||
    "https://placehold.co/400x400/e8f7f6/00A693?text=Kidareh";

  return {
    ...raw,
    id: raw.id,
    name: raw.name || raw.title || "کالا",
    price: Number(raw.price) || 0,
    oldPrice: Number(raw.oldPrice ?? raw.old_price ?? 0) || 0,
    store: raw.store || raw.store_name || "فروشگاه",
    status: raw.status || "موجود",
    distance: raw.distance || raw.city || raw.store_city || "",
    image,
  };
}

export default function Following() {
  const { isAuthenticated } = useAuth();
  const [stores, setStores] = useState<FollowedStore[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [storesRes, productsRes] = await Promise.all([
        apiRequest<{ stores: FollowedStore[] }>("/api/stores/following", { auth: true }),
        apiRequest<{ products?: any[] } | any[]>("/api/products/followed", { auth: true }),
      ]);
      setStores(Array.isArray(storesRes?.stores) ? storesRes.stores : []);
      const list = Array.isArray(productsRes)
        ? productsRes
        : Array.isArray((productsRes as any)?.products)
          ? (productsRes as any).products
          : [];
      setProducts(list.map(normalizeProduct));
    } catch (e: any) {
      setError(e?.message || "خطا در دریافت ویترین دنبال‌شده‌ها");
      setStores([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    document.title = "دنبال‌شده‌ها | کی‌داره";
    fetchFeed();
  }, [fetchFeed]);

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[var(--border-light)] bg-[var(--bg-primary)]/90 px-4 py-4 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--brand-primary)]">خریدار</p>
            <h1 className="text-xl font-black">فروشگاه‌های دنبال‌شده</h1>
          </div>
          <button
            type="button"
            onClick={fetchFeed}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--border-light)] bg-white"
            aria-label="تازه‌سازی"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        <p className="mt-2 text-sm font-bold leading-7 text-[var(--text-muted)]">
          فقط کالاهای مغازه‌هایی که دنبال می‌کنی
        </p>
      </header>

      <div className="px-4 pt-4">
        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4 py-16 text-center">
            <p className="font-bold text-rose-500">{error}</p>
            <button
              type="button"
              onClick={fetchFeed}
              className="rounded-xl bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && !error && stores.length === 0 && (
          <EmptyState
            icon={Users}
            title="هنوز فروشگاهی را دنبال نکرده‌اید"
            description="از صفحه فروشگاه، دکمه دنبال کردن را بزن تا کالاهای همان مغازه اینجا بیاید"
          />
        )}

        {!loading && !error && stores.length > 0 && (
          <>
            <div className="mb-4 flex gap-2 overflow-x-auto presence-hide-scroll pb-1">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${store.id}`}
                  className="flex shrink-0 items-center gap-2 rounded-full border border-[var(--border-light)] bg-white px-3 py-2"
                >
                  <Store className="h-4 w-4 text-[var(--brand-primary)]" />
                  <span className="text-xs font-black">{store.name}</span>
                </Link>
              ))}
            </div>

            {products.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="هنوز کالای تأییدشده‌ای نیست"
                description="فروشگاه‌های دنبال‌شده هنوز ویترین آماده‌ای ندارند"
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} viewMode="grid" />
                ))}
              </div>
            )}
          </>
        )}

        {!loading && !error && stores.length === 0 && (
          <div className="mt-4 text-center">
            <Link
              to="/stores"
              className="inline-flex h-12 items-center rounded-2xl bg-[var(--brand-primary)] px-5 text-sm font-black text-white"
            >
              دیدن فروشگاه‌ها
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
