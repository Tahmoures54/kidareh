import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Share2, AlertCircle, Loader2, UserPlus, Check } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { apiRequest, ApiError } from "../../utils/api";
import { StoreData, TabMode } from "./types";
import { calcDist, fmtDist, fa } from "./utils";

import { StoreSkeleton } from "./components/Skeleton";
import { StoreHeader } from "./components/StoreHeader";
import { ProductsTab } from "./components/ProductsTab";
import { AboutTab } from "./components/AboutTab";
import { BottomActionBar } from "./components/BottomActionBar";

const SPRING_TRANSITION = { type: "spring" as const, stiffness: 300, damping: 25 };

const Toast = ({ msg }: { msg: string }) => (
  <motion.div initial={{ opacity: 0, y: -24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -18, scale: 0.96 }} className="fixed top-[max(16px,env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[100] bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-none">
    <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" /> {msg}
  </motion.div>
);

export default function StoreDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<TabMode>("products");
  const [toast, setToast] = useState("");
  
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const [following, setFollowing] = useState(false);
  const [followLoad, setFollowLoad] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg); setTimeout(() => { if (mounted.current) setToast(""); }, 2500);
  }, []);

  const fetchStore = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await apiRequest<StoreData>(`/api/stores/${id}`, { auth: false });
      if (!mounted.current) return;
      setStore({
        ...data,
        rating: Number(data.rating ?? 0),
        reviews: Number(data.reviews ?? 0),
        products: Array.isArray(data.products) ? data.products.map(p => ({ ...p, views: Number(p.views ?? 0) })) : [],
      });
    } catch (err: any) {
      if (!mounted.current) return;
      setError(err instanceof ApiError ? err.message : "خطا در دریافت اطلاعات");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchStore(); }, [fetchStore]);

  useEffect(() => {
    if (!store?.id) return;
    if (user) apiRequest<{ following: boolean }>(`/api/stores/${store.id}/follow-status`, { auth: true }).then(r => { if (mounted.current) setFollowing(r.following); }).catch(() => {});
    apiRequest<{ count: number }>(`/api/stores/${store.id}/followers/count`, { auth: false }).then(r => { if (mounted.current) setFollowersCount(r.count ?? 0); }).catch(() => {});
  }, [store?.id, user]);

  useEffect(() => { navigator.geolocation?.getCurrentPosition(p => { if (mounted.current) setUserLoc({ lat: p.coords.latitude, lng: p.coords.longitude }); }, () => {}); }, []);

  const distInfo = useMemo(() => {
    if (!store || !userLoc || !store.latitude || !store.longitude) return null;
    const km = calcDist(userLoc.lat, userLoc.lng, store.latitude, store.longitude);
    const mins = Math.max(3, Math.round((km / 28) * 60));
    return { text: fmtDist(km), mins: fa(mins) };
  }, [store, userLoc]);

  const hasBlueTick = useMemo(() => store?.blue_tick_expires_at ? new Date(store.blue_tick_expires_at) > new Date() : false, [store]);

  const handleRoute = () => {
    if (!store) return;
    const url = (store.latitude && store.longitude) ? `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}` : store.address ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(store.address)}` : null;
    if (url) window.open(url, "_blank"); else showToast("مختصات ثبت نشده");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: store?.name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); showToast("لینک کپی شد"); }
    } catch {}
  };

  const handleFollow = async () => {
    if (!user) { navigate("/login"); return; }
    if (!store?.id || followLoad) return;
    const prev = following; setFollowing(!prev); setFollowersCount(c => Math.max(0, c + (!prev ? 1 : -1))); setFollowLoad(true);
    try {
      const r = await apiRequest<{ following: boolean }>(`/api/stores/${store.id}/follow`, { method: "POST", auth: true });
      if (mounted.current) setFollowing(r.following);
    } catch {
      if (!mounted.current) return;
      setFollowing(prev); setFollowersCount(c => Math.max(0, c + (prev ? 1 : -1))); showToast("خطا رخ داد");
    } finally { if (mounted.current) setFollowLoad(false); }
  };

  if (loading) return <StoreSkeleton />;
  if (error || !store) return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">فروشگاه یافت نشد</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
      <button onClick={() => navigate(-1)} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg active:scale-95 transition-transform">بازگشت</button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] pb-[96px] font-sans" dir="rtl">
      <AnimatePresence>{toast && <Toast msg={toast} />}</AnimatePresence>

      <div className="fixed top-0 inset-x-0 z-50 px-4 pt-[max(16px,env(safe-area-inset-top))] flex justify-between pointer-events-none">
        <motion.button whileTap={{ scale: 0.9 }} onClick={() => navigate(-1)} className="pointer-events-auto w-11 h-11 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-[20px] shadow-sm flex items-center justify-center text-slate-800 dark:text-slate-200"><ArrowRight className="w-5 h-5" /></motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={handleShare} className="pointer-events-auto w-11 h-11 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/40 dark:border-slate-700/50 rounded-[20px] shadow-sm flex items-center justify-center text-slate-800 dark:text-slate-200"><Share2 className="w-5 h-5" /></motion.button>
      </div>

      <StoreHeader store={store} hasBlueTick={hasBlueTick} followersCount={followersCount} />

      <div className="bg-[#F8FAFC] dark:bg-[#0B0F19] rounded-t-[40px] -mt-8 relative z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.1)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.5)] pt-6 min-h-[50vh]">
        <div className="px-5 mb-6 flex items-center justify-between gap-3">
           <button onClick={handleFollow} disabled={followLoad} className={`h-11 px-5 rounded-[18px] text-xs font-black transition-all flex items-center justify-center gap-2 shrink-0 ${following ? "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300" : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 active:scale-95"}`}>
             {followLoad ? <Loader2 className="w-4 h-4 animate-spin" /> : following ? "دنبال شده" : <><UserPlus className="w-4 h-4" /> دنبال کردن</>}
           </button>
           <div className="bg-slate-200/60 dark:bg-slate-800 p-1 rounded-[20px] flex-1 flex relative">
            {(["products", "about"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`relative flex-1 py-2 text-xs font-black z-10 transition-colors rounded-[16px] ${tab === t ? "text-indigo-700 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400"}`}>
                {tab === t && <motion.div layoutId="storeTab" transition={SPRING_TRANSITION} className="absolute inset-0 bg-white dark:bg-slate-700 rounded-[16px] shadow-sm -z-10" />}
                {t === "products" ? "محصولات" : "اطلاعات"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <AnimatePresence mode="wait">
            {tab === "products" ? (
              <motion.div key="products" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <ProductsTab products={store.products || []} onProductClick={id => navigate(`/product/${id}`)} />
              </motion.div>
            ) : (
              <motion.div key="about" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <AboutTab store={store} distInfo={distInfo} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <BottomActionBar storeId={store.id} phone={store.phone} onNavigate={handleRoute} onMessageClick={() => navigate(`/messages?storeId=${store.id}`)} onPhoneClick={e => { if (!store.phone) { e.preventDefault(); showToast("شماره ثبت نشده"); } }} />
    </div>
  );
}