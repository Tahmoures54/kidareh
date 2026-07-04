import React, { useState, useEffect, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react"; // یکپارچه شدن فریمورک

import { StoreData, TabMode, DistInfo } from "./types";
import { StoreHeader } from "./components/StoreHeader";
import { ProductsTab } from "./components/ProductsTab";
import { AboutTab } from "./components/AboutTab";
import { BottomActionBar } from "../../components/ui/BottomActionBar"; // مسیر اصلاح شده
import { StoreSkeleton } from "./components/Skeleton";
import { useAuth } from "../../context/AuthContext";
import { apiRequest } from "../../utils/api";

// توابعی که قبلاً اینجا بودند، باید در این فایل باشند:
import { calcDist, fmtDist } from "./utils"; 

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mounted = useRef(true);

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabMode>("products");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [distInfo, setDistInfo] = useState<DistInfo | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  // Fetch Store Data
  useEffect(() => {
    const fetchStore = async () => {
      if (!id) return;
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest<StoreData>(`/api/stores/${id}`);
        if (!mounted.current) return; // جلوگیری از آپدیت استیت روی کامپوننت غیرفعال
        setStore(data);
        document.title = `${data.name} — کی داره؟`;
      } catch (err) {
        if (!mounted.current) return;
        setError("خطا در بارگذاری اطلاعات فروشگاه");
      } finally {
        if (mounted.current) setLoading(false);
      }
    };
    fetchStore();
  }, [id]);

  // Get User Location
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  const hasBlueTick = useMemo(
    () => (store?.blue_tick_expires_at ? new Date(store.blue_tick_expires_at) > new Date() : false),
    [store]
  );

  // Calculate Distance
  useEffect(() => {
    if (userLoc && store?.latitude && store?.longitude) {
      const km = calcDist(userLoc.lat, userLoc.lng, store.latitude, store.longitude);
      const mins = Math.round((km / 40) * 60); // فرض سرعت ۴۰ کیلومتر بر ساعت
      setDistInfo({ text: fmtDist(km), mins: String(mins) });
    }
  }, [userLoc, store]);

  // --- Render States ---

  if (loading) return <StoreSkeleton />;
  
  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-primary)] p-6 text-center">
        <h2 className="text-xl font-black mb-2 text-[var(--text-primary)]">
          {error || "فروشگاه یافت نشد"}
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-6">لطفاً دوباره تلاش کنید یا به صفحه قبل برگردید.</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-sm text-[var(--text-primary)]"
          >
            بازگشت
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-[var(--brand-primary)] text-white rounded-2xl font-bold text-sm"
          >
            تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  // --- Render Main UI ---
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--bg-primary)] pb-28 font-sans"
      dir="rtl"
    >
      <StoreHeader
        store={store}
        hasBlueTick={hasBlueTick}
        followersCount={store.reviews * 12 || 0} // یک تقریب ساده برای تعداد فالوور
      />

      <main className="px-5 -mt-6 relative z-10">
        {/* Tabs */}
        <div className="bg-[var(--bg-secondary)] p-1.5 rounded-2xl flex relative shadow-inner border border-[var(--border-light)] mb-6">
          {(["products", "about"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 py-3 text-sm font-black z-10 transition-colors rounded-xl ${
                activeTab === tab
                  ? "text-[var(--brand-primary)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="storeActiveTab"
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="absolute inset-0.5 bg-[var(--bg-primary)] rounded-xl shadow-sm -z-10"
                />
              )}
              {tab === "products" ? "کالاها" : "درباره ما"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "products" ? (
            <motion.div
              key="products"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ProductsTab
                products={store.products || []}
                onProductClick={(productId) => navigate(`/product/${productId}`)}
              />
            </motion.div>
          ) : (
            <motion.div
              key="about"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AboutTab store={store} distInfo={distInfo} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <BottomActionBar
        storeId={store.id}
        phone={store.phone}
        onNavigate={() => {
          if (store.latitude && store.longitude) {
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`,
              "_blank"
            );
          }
        }}
        onMessageClick={() =>
          navigate(user ? `/messages?store=${store.id}` : "/login")
        }
        onPhoneClick={(e) => {
          if (!store.phone) e.preventDefault();
        }}
      />
    </motion.div>
  );
}