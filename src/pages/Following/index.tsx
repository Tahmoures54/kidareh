import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, RefreshCw, Users } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import EmptyState from "../../components/ui/EmptyState";
import { FeedColumn, FeedStack } from "../../components/feed/FeedColumn";
import { FeedPost } from "../../components/feed/FeedPost";
import { FeedStories, type StoryItem } from "../../components/feed/FeedStories";
import { productToFeedPost } from "../../lib/feedMappers";

interface FollowedStore {
  id: number;
  name: string;
  category?: string;
  image_url?: string | null;
  city?: string;
  product_count?: number;
  follower_count?: number;
}

export default function Following() {
  const { isAuthenticated } = useAuth();
  const [stores, setStores] = useState<FollowedStore[]>([]);
  const [products, setProducts] = useState<Record<string, any>[]>([]);
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
      setProducts(list);
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

  const posts = useMemo(() => products.map((product) => productToFeedPost(product)), [products]);
  const stories = useMemo<StoryItem[]>(
    () =>
      stores.map((store) => ({
        id: String(store.id),
        storeId: store.id,
        name: store.name,
        href: `/store/${store.id}`,
        image: store.image_url,
        live: true,
        isAd: false,
        frames: store.image_url
          ? [
              {
                id: `store-${store.id}`,
                image: store.image_url,
                title: store.name,
                href: `/store/${store.id}`,
              },
            ]
          : [],
      })),
    [stores]
  );

  return (
    <div className="min-h-screen bg-white pb-28" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[var(--border-light)] bg-white/90 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[470px] items-center justify-between">
          <div>
            <p className="text-xs font-black text-[var(--brand-primary)]">فید دنبال‌شده‌ها</p>
            <h1 className="text-xl font-black">فروشگاه‌هایی که دنبال می‌کنی</h1>
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
      </header>

      <FeedColumn>
        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="h-8 w-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        )}

        {!loading && error && (
          <div className="space-y-4 px-4 py-16 text-center">
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
          <div className="px-4 py-8">
            <EmptyState
              icon={Users}
              title="هنوز فروشگاهی را دنبال نکرده‌اید"
              description="از صفحه فروشگاه، دکمه دنبال کردن را بزن تا کالاهای همان مغازه اینجا بیاید"
            />
            <div className="mt-4 text-center">
              <Link
                to="/stores"
                className="inline-flex h-12 items-center rounded-2xl bg-[var(--brand-primary)] px-5 text-sm font-black text-white"
              >
                دیدن فروشگاه‌ها
              </Link>
            </div>
          </div>
        )}

        {!loading && !error && stores.length > 0 && (
          <>
            <FeedStories items={stories} />
            {posts.length === 0 ? (
              <div className="px-4 py-8">
                <EmptyState
                  icon={Heart}
                  title="هنوز کالای تأییدشده‌ای نیست"
                  description="فروشگاه‌های دنبال‌شده هنوز ویترین آماده‌ای ندارند"
                />
              </div>
            ) : (
              <FeedStack>
                {posts.map((post) => (
                  <FeedPost key={post.key} post={post} />
                ))}
              </FeedStack>
            )}
          </>
        )}
      </FeedColumn>
    </div>
  );
}
