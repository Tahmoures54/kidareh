import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { ProductCard } from "../../components/cards/ProductCard";
import { GuestView } from "./components/GuestView";
import { SavedHeader, type Filter, type ViewMode } from "./components/SavedHeader";
import EmptyState from "../../components/ui/EmptyState";
import { FeedColumn, FeedStack } from "../../components/feed/FeedColumn";
import { FeedPost } from "../../components/feed/FeedPost";
import { listingToFeedPost, productToFeedPost, type FeedPostData } from "../../lib/feedMappers";
import { listSavedListingIds, onFeedChange, setProductSaved, syncSavedProductIds } from "../../lib/feedStorage";
import { enrichListing, getListing } from "../../presence/engine";
import { usePresenceOrigin } from "../../hooks/usePresenceOrigin";

interface SavedProduct {
  id: number | string;
  name: string;
  title?: string;
  price: number;
  oldPrice?: number;
  old_price?: number;
  store?: string;
  store_name?: string;
  status?: string;
  distance?: string;
  image?: string;
  images?: string;
  hasPriceDrop?: boolean;
  city?: string;
}

function normalizeProduct(raw: any): SavedProduct & Record<string, any> {
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
    "https://placehold.co/400x400/1e293b/94a3b8?text=No+Image";

  return {
    ...raw,
    id: raw.id,
    name: raw.name || raw.title || "کالا",
    price: Number(raw.price) || 0,
    oldPrice: Number(raw.oldPrice ?? raw.old_price ?? 0) || 0,
    store: raw.store || raw.store_name || "فروشگاه",
    status: raw.status || "موجود",
    distance: raw.distance || raw.city || "",
    image,
    hasPriceDrop: Boolean(
      raw.hasPriceDrop ||
        (raw.old_price && Number(raw.old_price) > Number(raw.price))
    ),
  };
}

export default function Saved() {
  const { user, isAuthenticated } = useAuth();
  const [products, setProducts] = useState<(SavedProduct & Record<string, any>)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const { origin } = usePresenceOrigin();
  const [listingTick, setListingTick] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortAsc, setSortAsc] = useState(true);

  const fetchSaved = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any[]>("/api/products/saved", { auth: true });
      const list = Array.isArray(data) ? data.map(normalizeProduct) : [];
      setProducts(list);
      syncSavedProductIds(list.map((item) => item.id));
    } catch (e: any) {
      setError(e?.message || "خطا در دریافت لیست ذخیره‌شده‌ها");
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);

  useEffect(() => onFeedChange(() => setListingTick((n) => n + 1)), []);

  const listingPosts = useMemo<FeedPostData[]>(() => {
    return listSavedListingIds()
      .map((id) => {
        const raw = getListing(id);
        if (!raw) return null;
        return enrichListing(raw, origin);
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .map(listingToFeedPost);
  }, [origin, listingTick]);

  const counts = useMemo(
    () => ({
      all: products.length + listingPosts.length,
      price_drop: products.filter((p) => p.hasPriceDrop).length,
      available: products.filter((p) => p.status === "موجود" || !p.status).length,
    }),
    [listingPosts.length, products]
  );

  const filtered = useMemo(() => {
    let list = [...products];
    if (filter === "price_drop") list = list.filter((p) => p.hasPriceDrop);
    if (filter === "available")
      list = list.filter((p) => p.status === "موجود" || !p.status);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (p) =>
          String(p.name).toLowerCase().includes(q) ||
          String(p.store || "").toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => (sortAsc ? a.price - b.price : b.price - a.price));
    return list;
  }, [products, filter, searchQuery, sortAsc]);

  const productPosts = useMemo(
    () => filtered.map((product) => productToFeedPost(product)),
    [filtered]
  );

  const feedPosts = useMemo(() => {
    if (filter !== "all") return productPosts;
    const q = searchQuery.trim().toLowerCase();
    const listings = q
      ? listingPosts.filter((post) =>
          `${post.title} ${post.storeName}`.toLowerCase().includes(q)
        )
      : listingPosts;
    return [...listings, ...productPosts];
  }, [filter, listingPosts, productPosts, searchQuery]);

  const removeOne = async (id: string | number) => {
    const sid = String(id);
    setProducts((prev) => prev.filter((p) => String(p.id) !== sid));
    setProductSaved(id, false);
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(sid);
      return next;
    });
    try {
      await apiRequest("/api/products/save", {
        method: "POST",
        auth: true,
        body: { productId: Number(id), save: false },
      });
    } catch {
      fetchSaved();
    }
  };

  const batchRemove = async () => {
    const ids = Array.from(selected);
    setProducts((prev) => prev.filter((p) => !selected.has(String(p.id))));
    setSelected(new Set());
    setSelectionMode(false);
    await Promise.allSettled(
      ids.map((id) =>
        apiRequest("/api/products/save", {
          method: "POST",
          auth: true,
          body: { productId: Number(id), save: false },
        })
      )
    );
  };

  const toggleSelect = (id: string | number) => {
    const sid = String(id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  if ((!isAuthenticated || !user) && listingPosts.length === 0) {
    return <GuestView />;
  }

  return (
    <div className="min-h-screen bg-white pb-28" dir="rtl">
      <SavedHeader
        selectionMode={selectionMode}
        selectedCount={selected.size}
        onCancelSelection={() => {
          setSelectionMode(false);
          setSelected(new Set());
        }}
        onBatchRemove={batchRemove}
        productCount={products.length + listingPosts.length}
        onToggleSort={() => setSortAsc((v) => !v)}
        onRefresh={fetchSaved}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filter={filter}
        setFilter={setFilter}
        counts={counts}
        viewMode={viewMode}
        setViewMode={setViewMode}
      />

      <div className="px-4 pt-4">
        {loading && (
          <div className="flex justify-center py-20">
            <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand-primary)]" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16 space-y-4">
            <p className="text-rose-500 font-bold">{error}</p>
            <button
              onClick={fetchSaved}
              className="px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-bold"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {!loading && !error && feedPosts.length === 0 && (
          <EmptyState
            icon={Heart}
            title={
              searchQuery || filter !== "all"
                ? "نتیجه‌ای یافت نشد"
                : "هنوز کالایی ذخیره نکرده‌اید"
            }
            description={
              searchQuery || filter !== "all"
                ? "فیلتر یا عبارت جستجو را تغییر دهید"
                : "روی نشان هر پست بزن تا کالا اینجا بماند"
            }
          />
        )}

        {!loading && !error && feedPosts.length > 0 && viewMode === "list" && !selectionMode && (
          <FeedColumn className="-mx-4">
            <FeedStack>
              {feedPosts.map((post) => (
                <FeedPost
                  key={post.key}
                  post={post}
                  onRemoved={(item) => {
                    if (item.productId) removeOne(item.productId);
                  }}
                />
              ))}
            </FeedStack>
          </FeedColumn>
        )}

        {!loading && !error && filtered.length > 0 && (viewMode === "grid" || selectionMode) && (
          <motion.div
            layout
            className={
              viewMode === "grid" || selectionMode
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-3"
            }
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={selectionMode ? "grid" : viewMode}
                  onRemove={removeOne}
                  isSelected={selected.has(String(product.id))}
                  onToggleSelect={toggleSelect}
                  selectionMode={selectionMode}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {!selectionMode && isAuthenticated && products.length > 0 && (
        <button
          onClick={() => setSelectionMode(true)}
          className="fixed bottom-24 left-4 z-30 px-4 py-2 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-light)] shadow-lg text-xs font-bold text-[var(--text-secondary)]"
        >
          انتخاب چندتایی
        </button>
      )}
    </div>
  );
}
