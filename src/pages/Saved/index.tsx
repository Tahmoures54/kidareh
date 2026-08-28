import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, RefreshCw } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";
import { ProductCard } from "../../components/cards/ProductCard";
import { GuestView } from "./components/GuestView";
import { SavedHeader, type Filter, type ViewMode } from "./components/SavedHeader";
import EmptyState from "../../components/ui/EmptyState";

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
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
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
      const data = await apiRequest<any[]>("/api/products/saved");
      const list = Array.isArray(data) ? data.map(normalizeProduct) : [];
      setProducts(list);
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

  const counts = useMemo(
    () => ({
      all: products.length,
      price_drop: products.filter((p) => p.hasPriceDrop).length,
      available: products.filter((p) => p.status === "موجود" || !p.status).length,
    }),
    [products]
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

  const removeOne = async (id: string | number) => {
    const sid = String(id);
    setProducts((prev) => prev.filter((p) => String(p.id) !== sid));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(sid);
      return next;
    });
    try {
      await apiRequest("/api/products/saved", {
        method: "POST",
        body: JSON.stringify({ productId: Number(id), save: false }),
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
        apiRequest("/api/products/saved", {
          method: "POST",
          body: JSON.stringify({ productId: Number(id), save: false }),
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

  if (!isAuthenticated || !user) {
    return <GuestView />;
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-28" dir="rtl">
      <SavedHeader
        selectionMode={selectionMode}
        selectedCount={selected.size}
        onCancelSelection={() => {
          setSelectionMode(false);
          setSelected(new Set());
        }}
        onBatchRemove={batchRemove}
        productCount={products.length}
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

        {!loading && !error && filtered.length === 0 && (
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
                : "کالاهای مورد علاقه را با ضربه روی قلب ذخیره کنید"
            }
          />
        )}

        {!loading && !error && filtered.length > 0 && (
          <motion.div
            layout
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-3"
            }
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
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

      {!selectionMode && products.length > 0 && (
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
