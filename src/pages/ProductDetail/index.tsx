import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AlertCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react"; // یکپارچه شدن فریمورک

import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError } from "../../utils/api";

import { ProductData, Review } from "./types";
import { FloatingHeader } from "./components/FloatingHeader";
import { ImageCarousel, GalleryModal } from "./components/ImageGallery";
import { ProductInfo } from "./components/ProductInfo";
import { StoreCard } from "./components/StoreCard";

// مسیر اصلاح شده
import { BottomActionBar } from "../../components/ui/BottomActionBar";

// --- Constants & Helpers ---

const FALLBACK = "https://placehold.co/800x800/1e293b/94a3b8?text=No+Image";

// کامپوننت Toast محلی مخصوص این صفحه (چون استایل متفاوتی دارد)
const Toast = ({ msg, type = "success" }: { msg: string; type?: "success" | "error" }) => (
  <motion.div
    initial={{ opacity: 0, y: -20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -20, scale: 0.9 }}
    className={`fixed top-12 left-1/2 -translate-x-1/2 z-[100] text-white text-sm font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 ${
      type === "success"
        ? "bg-slate-900 dark:bg-white dark:text-slate-900"
        : "bg-rose-600"
    }`}
  >
    {type === "success" ? (
      <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
    ) : (
      <AlertCircle className="w-4 h-4" />
    )}
    {msg}
  </motion.div>
);

const calcDist = (la1: number, lo1: number, la2: number, lo2: number): string => {
  if (!la1 || !lo1 || !la2 || !lo2) return "نامشخص";
  
  const R = 6371;
  const dLa = ((la2 - la1) * Math.PI) / 180;
  const dLo = ((lo2 - lo1) * Math.PI) / 180;
  const a =
    Math.sin(dLa / 2) ** 2 +
    Math.cos((la1 * Math.PI) / 180) *
      Math.cos((la2 * Math.PI) / 180) *
      Math.sin(dLo / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return d < 1 ? `${Math.round(d * 1000)} متر` : `${d.toFixed(1)} کیلومتر`;
};

// --- Main Component ---

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const mounted = useRef(true);

  const [product, setProduct] = useState<ProductData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  const [saved, setSaved] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "success" | "error" } | null>(null);

  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // --- Effects ---

  useEffect(() => {
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {}
    );
  }, []);

  // --- Callbacks ---

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  }, []);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest<ProductData>(`/api/products/${id}`);
      if (!mounted.current) return; // رفع باگ Memory Leak
      setProduct(data);
      document.title = `${data.name} — کی داره؟`;
    } catch (err: unknown) {
      if (!mounted.current) return; // رفع باگ Memory Leak
      setError(err instanceof ApiError && err.status === 404 
        ? "این آگهی یافت نشد یا حذف شده است" 
        : "خطا در دریافت اطلاعات");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [id]);

  const fetchReviews = useCallback(async () => {
    if (!id) return;
    try {
      const data = await apiRequest<Review[]>(`/api/products/${id}/reviews`);
      if (!mounted.current) return; // رفع باگ Memory Leak
      setReviews(Array.isArray(data) ? data : []);
    } catch {
      // silent catch for reviews
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
    fetchReviews();
  }, [fetchProduct, fetchReviews]);

  useEffect(() => {
    if (!product?.store_id || !user) return;
    
    apiRequest<{ following: boolean }>(`/api/stores/${product.store_id}/follow-status`)
      .then((r) => mounted.current && setFollowing(r.following))
      .catch(() => {});
      
    apiRequest<{ count: number }>(`/api/stores/${product.store_id}/followers/count`)
      .then((r) => mounted.current && setFollowers(r.count))
      .catch(() => {});
  }, [product?.store_id, user]);

  // --- Memos ---

  const images = useMemo(() => {
    if (!product) return [FALLBACK];
    const list = product.images?.filter(Boolean) ?? (product.image_url ? [product.image_url] : []);
    return list.length ? list : [FALLBACK];
  }, [product]);

  const distance = useMemo(() => {
    if (!userLoc || !product?.lat || !product?.lng) return null;
    return calcDist(userLoc.lat, userLoc.lng, product.lat, product.lng);
  }, [userLoc, product]);

  const avgRating = useMemo(() => {
    if (!reviews.length) return "۵.۰";
    return (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1);
  }, [reviews]);

  const isProductAvailable = 
    (product?.status || "").toLowerCase() === "موجود" || 
    (product?.status || "").toLowerCase() === "available";

  const hasBlueTick = useMemo(() => {
    if (!product?.blue_tick_expires_at) return false;
    return new Date(product.blue_tick_expires_at) > new Date();
  }, [product]);

  // --- Handlers ---

  const handleSave = async () => {
    if (!user) return navigate("/login");
    const next = !saved;
    setSaved(next);
    setSaveLoading(true);
    try {
      await apiRequest("/api/products/save", {
        method: "POST",
        body: { productId: Number(id), save: next },
      });
      showToast(next ? "به علاقه‌مندی‌ها اضافه شد" : "از علاقه‌مندی‌ها حذف شد");
    } catch {
      setSaved(!next);
      showToast("خطا در ذخیره", "error");
    } finally {
      setSaveLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!user || !product?.store_id) return navigate("/login");
    const was = following;
    setFollowing(!was);
    setFollowers((c) => c + (was ? -1 : 1));
    setFollowLoading(true);
    try {
      const res = await apiRequest<{ following: boolean }>(`/api/stores/${product.store_id}/follow`, {
        method: "POST",
      });
      setFollowing(res.following);
    } catch {
      setFollowing(was);
      setFollowers((c) => c + (was ? 1 : -1));
    } finally {
      setFollowLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product?.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        showToast("لینک کپی شد");
      }
    } catch {
      // User canceled sharing
    }
  };

  const handleNavigate = () => {
    if (!product?.lat || !product?.lng) {
      return showToast("موقعیت نقشه ثبت نشده است", "error");
    }
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${product.lat},${product.lng}`, "_blank");
  };

  // --- Render Loading State ---
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <div className="h-[50vh] bg-[var(--bg-tertiary)] relative overflow-hidden">
          <div className="absolute inset-0 shimmer" />
        </div>
        <div className="bg-[var(--bg-primary)] -mt-10 rounded-t-[40px] p-6 space-y-6 relative z-10 h-[50vh]">
          <div className="h-8 bg-[var(--bg-tertiary)] rounded-full w-3/4 shimmer" />
          <div className="h-32 bg-[var(--bg-tertiary)] rounded-[28px] shimmer" />
        </div>
      </div>
    );
  }

  // --- Render Error State ---
  if (error || !product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-[var(--bg-primary)]">
        <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
        <h2 className="text-2xl font-black mb-2 text-[var(--text-primary)]">آگهی یافت نشد</h2>
        <p className="text-[var(--text-muted)] mb-8">{error}</p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-8 py-3.5 bg-[var(--bg-tertiary)] rounded-2xl font-bold text-[var(--text-primary)]"
          >
            بازگشت
          </button>
          <button
            onClick={fetchProduct}
            className="px-8 py-3.5 bg-[var(--brand-primary)] text-white rounded-2xl font-bold"
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
      className="min-h-[100dvh] bg-[var(--bg-primary)] pb-[120px] font-sans relative"
      dir="rtl"
    >
      <AnimatePresence>
        {toast && <Toast msg={toast.msg} type={toast.type} />}
      </AnimatePresence>

      <FloatingHeader
        saved={saved}
        saveLoading={saveLoading}
        onShare={handleShare}
        onSave={handleSave}
      />

      <ImageCarousel
        images={images}
        name={product.name}
        imgIndex={imgIndex}
        setImgIndex={setImgIndex}
        setGalleryOpen={setGalleryOpen}
      />

      <div className="bg-[var(--bg-primary)] rounded-t-[40px] -mt-8 relative z-20 px-5 pt-8 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
        <ProductInfo
          product={product}
          isAvailable={isProductAvailable}
          avgRating={avgRating}
        />
        <StoreCard
          storeName={product.store_name || ""}
          storeCity={product.store_city || ""}
          followers={followers}
          following={following}
          followLoading={followLoading}
          hasBlueTick={hasBlueTick}
          distance={distance}
          onFollow={handleFollow}
        />
      </div>

      <BottomActionBar
        phone={product.store_phone}
        onNavigate={handleNavigate}
      />

      <AnimatePresence>
        {galleryOpen && (
          <GalleryModal
            images={images}
            index={imgIndex}
            name={product.name}
            onClose={() => setGalleryOpen(false)}
            onPrev={() => setImgIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
            onNext={() => setImgIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}