import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Search, Heart, ShoppingBag, Sparkles } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError } from "../../utils/api";

import { GuestView } from "./components/GuestView";
import { SavedHeader, Filter, ViewMode } from "./components/SavedHeader";
import { ProductCard, SavedSkeleton } from "./components/ProductCard";

/* ─── Helpers ─── */
function normalize(item: any): any {
  if (!item?.id && !item?.product_id) return null;
  return {
    id: String(item.id || item.product_id),
    name: String(item.name || "کالا"),
    price: Number(item.price || 0),
    oldPrice: Number(item.oldPrice || item.old_price || 0),
    store: String(item.store || item.store_name || "فروشگاه"),
    status: item.status === "موجود" ? "موجود" : "ناموجود",
    distance: item.distance || "نامشخص",
    distanceValue: typeof item.distance === "number" ? item.distance : 999999,
    image: String(item.image || item.image_url || ""),
    hasPriceDrop: Number(item.oldPrice) > Number(item.price),
    addedAt: item.addedAt ? new Date(item.addedAt).getTime() : Date.now(),
  };
}

export default function Saved() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "distance">("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const isMountedRef = useRef(true);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    document.title = "نشان‌های من | کی‌داره";
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSaved = useCallback(async () => {
    if (!user) return;
    if (fetchPromiseRef.current) return fetchPromiseRef.current;

    const promise = (async () => {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError("");

      try {
        const data = await apiRequest<any[]>("/api/products/saved", { auth: true });
        if (!isMountedRef.current) return;
        setProducts((Array.isArray(data) ? data : []).map(normalize).filter(Boolean));
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          navigate("/login");
        } else {
          setError("ارتباط با سرور برقرار نشد.");
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
        fetchPromiseRef.current = null;
      }
    })();

    fetchPromiseRef.current = promise;
    return promise;
  }, [user, logout, navigate]);

  useEffect(() => {
    if (user) fetchSaved();
  }, [user, fetchSaved]);

  const handleRemove = useCallback(async (id: string) => {
    const itemToReAdd = products.find(p => p.id === id);
    setProducts((p) => p.filter((x) => x.id !== id));
    if (navigator.vibrate) navigator.vibrate(30);

    try {
      await apiRequest("/api/products/save", {
        method: "POST",
        auth: true,
        body: { productId: Number(id), save: false },
      });
    } catch {
      if (itemToReAdd) {
        setProducts(prev => [...prev, itemToReAdd].sort((a, b) => b.addedAt - a.addedAt));
      }
    }
  }, [products]);

  const handleBatchRemove = async () => {
    const ids = Array.from(selectedIds);
    const itemsToReAdd = products.filter(p => selectedIds.has(p.id));
    setProducts((p) => p.filter((x) => !selectedIds.has(x.id)));
    setSelectedIds(new Set());

    try {
      await Promise.all(ids.map((id) => apiRequest("/api/products/save", { method: "POST", auth: true, body: { productId: Number(id), save: false } }).catch(() => null)));
    } catch {
      setProducts(prev => [...prev, ...itemsToReAdd].sort((a, b) => b.addedAt - a.addedAt));
    }
  };

  const counts = useMemo(() => ({
    all: products.length,
    price_drop: products.filter((p) => p.hasPriceDrop).length,
    available: products.filter((p) => p.status === "موجود").length,
  }), [products]);

  const processedProducts = useMemo(() => {
    let res = [...products];
    if (filter === "price_drop") res = res.filter((p) => p.hasPriceDrop);
    else if (filter === "available") res = res.filter((p) => p.status === "موجود");

    if (searchQuery.trim()) res = res.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    res.sort((a, b) =>
      sort === "price_asc" ? a.price - b.price
      : sort === "price_desc" ? b.price - a.price
      : sort === "distance" ? a.distanceValue - b.distanceValue
      : b.addedAt - a.addedAt
    );
    return res;
  }, [products, filter, searchQuery, sort]);

  if (!user) return <GuestView />;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans" dir="rtl">
      <SavedHeader
        selectionMode={selectedIds.size > 0}
        selectedCount={selectedIds.size}
        onCancelSelection={() => setSelectedIds(new Set())}
        onBatchRemove={handleBatchRemove}
        productCount={products.length}
        onToggleSort={() => setSort((s) => (s === "newest" ? "price_asc" : "newest"))}
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

      <main className="px-4 py-6">
        {loading ? (
          <SavedSkeleton viewMode={viewMode} />
        ) : error ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-gray-900 rounded-3xl border border-rose-100 dark:border-rose-900/40 p-8 text-center shadow-sm">
            <div className="w-16 h-16 bg-rose-50 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 font-bold">{error}</p>
            <button onClick={fetchSaved} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-sm w-full active:scale-95 transition shadow-lg shadow-indigo-500/20">
              تلاش مجدد
            </button>
          </motion.div>
        ) : processedProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-center py-24">
            <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-50 to-rose-50 dark:from-indigo-500/10 dark:to-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-gray-100 dark:border-gray-800 shadow-lg shadow-gray-200/50 dark:shadow-none">
              {searchQuery ? (
                <Search className="w-10 h-10 text-gray-400" />
              ) : (
                <Heart className="w-10 h-10 text-gray-300 dark:text-gray-600" />
              )}
              <div className="absolute -top-2 -right-2 bg-indigo-600 text-white rounded-full p-1.5 shadow-md border-2 border-white dark:border-gray-950">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <h3 className="font-black text-xl mb-2 text-gray-900 dark:text-white">
              {searchQuery ? "نتیجه‌ای یافت نشد" : "هنوز نشانی ندارید!"}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">
              {searchQuery ? "کالای مورد نظرت در لیست نشان‌ها نیست" : "با زدن آیکون قلب ❤️، کالاها رو اینجا ذخیره کن تا راحت پیداشون کنی"}
            </p>
            <Link to="/search" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/30 active:scale-95 transition">
              <ShoppingBag className="w-4 h-4" /> جستجوی کالاها
            </Link>
          </motion.div>
        ) : (
          <motion.div className={`grid gap-3 ${viewMode === "grid" ? "grid-cols-2" : "grid-cols-1"}`}>
            <AnimatePresence mode="popLayout">
              {processedProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  viewMode={viewMode}
                  onRemove={handleRemove}
                  isSelected={selectedIds.has(p.id)}
                  onToggleSelect={(id: string) => {
                    const n = new Set(selectedIds);
                    n.has(id) ? n.delete(id) : n.add(id);
                    setSelectedIds(n);
                  }}
                  selectionMode={selectedIds.size > 0}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>
    </div>
  );
}