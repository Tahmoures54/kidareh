import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Store, Plus, MessageCircle, BarChart3, Package,
  MapPin, Phone, LogOut, Eye, Search, AlertTriangle, BadgeCheck,
  ChevronDown, Settings, Crown, Zap, Users
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts";

import { useAuth } from "../../context/AuthContext";
import { ChartPeriod, FilterType, ProductStatus, StoreFormValues } from "./types";
import { Toast, EditStoreSheet, ProductItem, CustomTooltip } from "./components";
import {
  useSellerProducts, useStoreInfo, useFollowersCount, useContactsCount, useStoreStats,
  useUpdateProductStatus, useToggleProductVisibility, useDeleteProduct, useUpdateStore
} from "./hooks";

const STATUS_FLOW: Record<ProductStatus, ProductStatus> = {
  "موجود": "موجودی کم",
  "موجودی کم": "فقط ۱ عدد",
  "فقط ۱ عدد": "ناموجود",
  "ناموجود": "موجود",
};

export default function SellerPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Local UI State
  const [toast, setToast] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("weekly");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterType>("all");

  useEffect(() => { window.scrollTo(0, 0); document.title = "پنل فروشنده | کی‌داره"; }, []);

  const handleShowToast = useCallback((msg: string) => {
    if(navigator.vibrate) navigator.vibrate(40);
    setToast(msg);
  }, []);

  // React Query Hooks
  const { data: products = [], isLoading: productsLoading } = useSellerProducts(!!user);
  const { data: storeInfo, isLoading: storeLoading } = useStoreInfo(!!user);
  const { data: chartData = [] } = useStoreStats(chartPeriod, !!user);
  const { data: contactsData } = useContactsCount(!!user);
  const { data: followersData } = useFollowersCount(!!user);

  // Mutations
  const updateStatusMut = useUpdateProductStatus(handleShowToast);
  const toggleVisibilityMut = useToggleProductVisibility(handleShowToast);
  const deleteProductMut = useDeleteProduct(() => {
    handleShowToast("کالا برای همیشه حذف شد");
    setDeletingId(null);
  });
  const updateStoreMut = useUpdateStore(() => {
    setEditingStore(false);
    handleShowToast("اطلاعات فروشگاه به‌روز شد");
  });

  // Handlers
  const handleDeleteTrigger = useCallback((id: number) => {
    if (deletingId !== id) {
      if(navigator.vibrate) navigator.vibrate(40);
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
      return;
    }
    deleteProductMut.mutate(id);
  }, [deletingId, deleteProductMut]);

  const handleShare = useCallback(async (product: any) => {
    const url = `${window.location.origin}/product/${product.id}`;
    if (navigator.share) await navigator.share({ title: product.name, url });
    else { await navigator.clipboard.writeText(url); handleShowToast("لینک کپی شد"); }
  }, [handleShowToast]);

  // Computed Values
  const totalViews = useMemo(() => products.reduce((a, p) => a + p.views, 0), [products]);
  const lowStockCount = useMemo(() => products.filter(p => p.status === "موجودی کم" || p.status === "فقط ۱ عدد").length, [products]);
  const hasBlueTick = useMemo(() => storeInfo?.blue_tick_expires_at ? new Date(storeInfo.blue_tick_expires_at) > new Date() : false, [storeInfo]);

  const filteredProducts = useMemo(() => products.filter(p => {
    const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchS = statusFilter === "all" || p.status === statusFilter;
    return matchQ && matchS;
  }), [products, searchQuery, statusFilter]);

  // Guest View
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6 text-center relative" dir="rtl">
        <div className="absolute top-20 right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative z-10 w-24 h-24 bg-indigo-50 border border-indigo-200 rounded-[2rem] shadow-xl flex justify-center items-center mb-8 rotate-3">
          <Store className="w-12 h-12 text-indigo-600" />
        </motion.div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-3">مدیریت فروشگاه شما</h2>
        <p className="text-sm text-gray-500 mb-10 max-w-xs font-medium">برای مدیریت فروشگاه خود وارد حساب کاربری شوید.</p>
        <Link to="/login" className="w-full max-w-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-black text-sm flex justify-center shadow-xl active:scale-95 transition-transform z-10">ورود به پنل</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 pb-28 text-gray-900 dark:text-white transition-colors" dir="rtl">
      <AnimatePresence>{toast && <Toast message={toast} onDismiss={() => setToast(null)} />}</AnimatePresence>

      <EditStoreSheet 
        isOpen={editingStore} onClose={() => setEditingStore(false)} 
        defaultValues={storeInfo || {}} 
        onSave={(data: StoreFormValues) => updateStoreMut.mutate(data)}
        isPending={updateStoreMut.isPending}
      />

      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 text-white pt-[max(1.5rem,env(safe-area-inset-top))] pb-16 px-4 relative overflow-hidden rounded-b-[2.5rem] shadow-lg">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/30 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/4" />
        <div className="flex items-start justify-between relative z-10 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex justify-center items-center border border-white/20 overflow-hidden shadow-inner">
                {storeInfo?.image ? <img src={storeInfo.image} className="w-full h-full object-cover" alt="Store logo" /> : <Store className="w-7 h-7 text-white" />}
              </div>
              {hasBlueTick && <div className="absolute -bottom-1 -right-1 bg-sky-500 rounded-full p-1 border-2 border-indigo-700 shadow-md"><BadgeCheck className="w-3.5 h-3.5 text-white" /></div>}
            </div>
            <div>
              <h1 className="font-black text-lg tracking-tight mb-1 drop-shadow-md">
                {storeLoading ? <div className="h-5 w-32 bg-white/20 rounded animate-pulse" /> : (storeInfo?.name || "فروشگاه من")}
              </h1>
              <p className="text-indigo-100 text-[11px] font-medium flex items-center gap-1.5 opacity-90">
                <MapPin className="w-3 h-3" /> {storeInfo?.city || "آدرس ثبت نشده"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setEditingStore(true)} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex justify-center items-center border border-white/20 active:scale-90"><Settings className="w-5 h-5" /></button>
            <button onClick={async () => { await logout(); navigate("/login"); }} className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex justify-center items-center border border-white/20 active:scale-90 hover:bg-rose-500/80"><LogOut className="w-5 h-5 ml-0.5" /></button>
          </div>
        </div>
      </header>

      {/* Stats Box */}
      <div className="px-4 -mt-10 relative z-10 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-800 p-4 grid grid-cols-2 gap-3">
          {[
            { label: "بازدید کل", value: totalViews, icon: Eye, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-500/10" },
            { label: "دنبال‌کننده‌ها", value: followersData?.count || 0, icon: Users, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
            { label: "کل کالاها", value: products.length, icon: Package, color: "text-fuchsia-600", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10" },
            { label: "تماس‌ها", value: contactsData?.count || 0, icon: Phone, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          ].map((s, i) => (
            <div key={i} className={`${s.bg} rounded-2xl p-3.5 flex items-center gap-3 border border-white/50 dark:border-gray-800/50`}>
              <div className={`w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex justify-center items-center shadow-sm ${s.color}`}><s.icon className="w-5 h-5" /></div>
              <div><p className="text-[10px] text-gray-500 font-bold mb-0.5">{s.label}</p><p className={`text-base font-black tracking-tight ${s.color}`}>{s.value.toLocaleString("fa-IR")}</p></div>
            </div>
          ))}
        </div>

        <AnimatePresence>
          {lowStockCount > 0 && (
            <motion.div initial={{ opacity: 0, height: 0, mt: 0 }} animate={{ opacity: 1, height: "auto", mt: 12 }} className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex justify-center items-center text-orange-600 dark:text-orange-400"><AlertTriangle className="w-4 h-4" /></div>
                <p className="text-xs font-bold text-orange-800 dark:text-orange-300"><span className="font-black text-orange-600 dark:text-orange-400 ml-1">{lowStockCount} کالا</span>نیاز به شارژ دارد</p>
              </div>
              <button onClick={() => setStatusFilter("موجودی کم")} className="text-[10px] font-black bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-lg shadow-sm">بررسی</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upsell Banner */}
      {!hasBlueTick && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 mb-6">
          <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-[2rem] p-5 overflow-hidden shadow-lg shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <h3 className="text-white font-black text-sm flex items-center gap-1.5 mb-1"><BadgeCheck className="w-4 h-4 text-sky-300" /> ارتقای اعتبار فروشگاه</h3>
                <p className="text-indigo-100 text-[11px] font-medium max-w-[200px]">با دریافت تیک آبی، اعتماد مشتریان و فروش را ۵ برابر کنید.</p>
              </div>
              <Link to="/buy-badge" className="bg-white text-indigo-600 font-black text-xs px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-transform flex items-center gap-1">ارتقا <Crown className="w-3.5 h-3.5" /></Link>
            </div>
          </div>
        </motion.div>
      )}

      {/* Quick Links */}
      <div className="px-4 mb-6 grid grid-cols-2 gap-3">
        <Link to="/buy-badge" className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-3xl border border-amber-200 dark:border-amber-500/20 p-4 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-[14px] flex justify-center items-center shadow-inner"><Zap className="w-5 h-5" /></div>
          <div><span className="block text-sm font-black text-amber-900 dark:text-amber-400">خرید برچسب</span><span className="block text-[9px] font-bold text-amber-700/70 dark:text-amber-400/70">افزایش فروش کالا</span></div>
        </Link>
        <Link to="/messages" className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-4 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.98] transition-all">
          <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 text-purple-500 rounded-[14px] flex justify-center items-center"><MessageCircle className="w-5 h-5" /></div>
          <div><span className="block text-sm font-black text-gray-900 dark:text-white">صندوق پیام</span><span className="block text-[9px] font-bold text-gray-500 dark:text-gray-400">پاسخ به مشتریان</span></div>
        </Link>
      </div>

      {/* Chart */}
      <div className="px-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-500" /> آمار بازدید کالاها</h3>
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              {(["weekly", "monthly"] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)} className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${chartPeriod === p ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-gray-500 dark:text-gray-400"}`}>
                  {p === "weekly" ? "هفته" : "ماه"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-40 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                <defs><linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#818cf8', strokeWidth: 1, strokeDasharray: '4 4' }} />
                <Area type="monotone" dataKey="views" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" activeDot={{ r: 6, fill: "#4f46e5", stroke: "#fff", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-base font-black flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-500" /> ویترین کالاها 
            <span className="text-[10px] bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded-full">{products.length}</span>
          </h3>
          
          {/* 👈 این همان دکمه درخواستی شماست */}
          <Link to="/add-product" className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5 active:scale-95 transition-transform">
            <Plus className="w-3.5 h-3.5" /> افزودن کالا
          </Link>
        </div>

        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative group">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="جستجوی نام کالا..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-3 pr-10 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as FilterType)} className="h-full appearance-none pl-8 pr-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-xs font-bold outline-none focus:border-indigo-400 focus:ring-4 shadow-sm">
              <option value="all">همه وضعیت‌ها</option>
              <option value="موجود">موجود</option>
              <option value="موجودی کم">موجودی کم</option>
              <option value="فقط ۱ عدد">فقط ۱ عدد</option>
              <option value="ناموجود">ناموجود</option>
            </select>
            <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {productsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 p-4 bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 animate-pulse shadow-sm">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
                <div className="flex-1 space-y-2 py-1"><div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4" /><div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-1/2" /><div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-lg w-full mt-2" /></div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 bg-white dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-800 shadow-sm">
            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-base font-black mb-1">{searchQuery ? "کالایی پیدا نشد" : "ویترین شما خالی است!"}</p>
            <p className="text-xs font-medium text-gray-500 mb-6">{searchQuery ? "جستجوی خود را تغییر دهید." : "اولین کالای خود را اضافه کنید."}</p>
            {!searchQuery && <Link to="/add-product" className="inline-flex items-center gap-2 text-sm font-black bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg active:scale-95 transition-transform"><Plus className="w-4 h-4" /> افزودن کالا</Link>}
          </motion.div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredProducts.map(p => (
                <ProductItem 
                  key={p.id} product={p} 
                  isUpdating={updateStatusMut.isPending || toggleVisibilityMut.isPending}
                  isDeleting={deletingId === p.id}
                  onStatusChange={() => updateStatusMut.mutate({ id: p.id, status: STATUS_FLOW[p.status] })}
                  onTogglePublic={() => toggleVisibilityMut.mutate({ id: p.id, isPublic: !p.isPublic })}
                  onDelete={handleDeleteTrigger} onShare={handleShare}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Floating Add */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 200, damping: 20 }} className="fixed bottom-[100px] left-4 z-40">
        <Link to="/add-product" className="relative group w-14 h-14 bg-indigo-600 text-white rounded-[1.25rem] shadow-xl shadow-indigo-600/30 flex justify-center items-center active:scale-90 transition-all border border-indigo-500">
          <div className="absolute inset-0 bg-white/20 rounded-[1.25rem] opacity-0 group-hover:opacity-100 transition-opacity" />
          <Plus className="w-7 h-7" />
        </Link>
      </motion.div>
    </div>
  );
}