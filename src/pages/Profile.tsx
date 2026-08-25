import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, Store, Settings, LogOut, ChevronLeft, 
  MapPin, Phone, Crown, BadgeCheck, 
  Shield, Package, MessageCircle, Heart, Users
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiRequest, ApiError } from "../utils/api";

export default function Profile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [hasStore, setHasStore] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "پروفایل من | کی‌داره";
    
    if (user) {
      checkStoreStatus();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkStoreStatus = async () => {
    try {
      await apiRequest("/api/stores/my/store", { auth: true });
      setHasStore(true);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 404) {
        setHasStore(false);
      } else {
        setHasStore(false);
        console.error("خطا در بررسی وضعیت فروشگاه:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-6" dir="rtl">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">ابتدا وارد شوید</h2>
          <p className="text-gray-500 mb-6 text-sm">برای مشاهده پروفایل باید وارد حساب کاربری خود شوید</p>
          <Link 
            to="/login" 
            className="inline-block bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-indigo-500/30 active:scale-95 transition-all"
          >
            ورود به حساب کاربری
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = user.role === "admin";
  const isSeller = user.role === "seller" || isAdmin;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-28 font-sans" dir="rtl">
      {/* Header */}
      <header className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white pt-8 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        
        <div className="max-w-2xl mx-auto relative z-10">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-black">پروفایل من</h1>
            <button 
              onClick={async () => { await logout(); navigate("/login"); }}
              className="p-2.5 bg-white/10 rounded-xl hover:bg-white/20 active:scale-90 transition-all border border-white/20"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 bg-white/20 rounded-[1.5rem] flex items-center justify-center text-3xl font-black border-2 border-white/30 backdrop-blur-sm shadow-inner">
                {user.phone?.charAt(0) || "👤"}
              </div>
              {isAdmin && (
                <div className="absolute -bottom-1.5 -right-1.5 bg-purple-500 rounded-full p-1.5 border-2 border-indigo-600 shadow-md">
                  <Shield className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h2 className="text-lg font-black mb-1 flex items-center gap-2">
                {isAdmin ? "مدیر سیستم" : isSeller ? "فروشنده" : "کاربر عادی"}
                {isSeller && hasStore && (
                  <BadgeCheck className="w-5 h-5 text-sky-300 drop-shadow-sm" />
                )}
              </h2>
              <p className="text-indigo-100 text-sm font-medium flex items-center gap-1.5 opacity-90">
                <Phone className="w-3.5 h-3.5" /> <span dir="ltr">{user.phone || "بدون شماره"}</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 -mt-12 relative z-10">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Link to="/saved" className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 text-center active:scale-95 transition-transform">
            <Heart className="w-6 h-6 text-rose-500 mx-auto mb-2" />
            <span className="block text-lg font-black text-gray-900 dark:text-white">0</span>
            <span className="text-[10px] text-gray-500 font-bold">ذخیره شده</span>
          </Link>
          
          <Link to="/messages" className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 text-center active:scale-95 transition-transform">
            <MessageCircle className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
            <span className="block text-lg font-black text-gray-900 dark:text-white">0</span>
            <span className="text-[10px] text-gray-500 font-bold">پیام‌ها</span>
          </Link>

          {isSeller ? (
            <Link to="/seller-panel" className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 shadow-sm border border-gray-100 dark:border-gray-800/60 text-center active:scale-95 transition-transform">
              <Package className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <span className="block text-lg font-black text-gray-900 dark:text-white">
                {loading ? "..." : hasStore ? "ویترین" : "ساخت"}
              </span>
              <span className="text-[10px] text-gray-500 font-bold">
                {loading ? "در حال بررسی" : hasStore ? "مدیریت" : "فروشگاه"}
              </span>
            </Link>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[1.5rem] p-4 border border-gray-100 dark:border-gray-800/60 text-center opacity-70">
              <Store className="w-6 h-6 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
              <span className="block text-lg font-black text-gray-400 dark:text-gray-500">-</span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">فروشگاه</span>
            </div>
          )}
        </div>

        {/* Action Cards */}
        <div className="space-y-3">
          
          {/* ✅ بخش کسب درآمد و معرفی دوستان (برای همه کاربران) */}
          <Link 
            to="/referral" 
            className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-500/10 dark:to-green-500/10 rounded-[1.5rem] p-4 flex items-center justify-between border border-emerald-200 dark:border-emerald-800/40 active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-emerald-900 dark:text-emerald-400">کسب درآمد</h3>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-500/80 mt-0.5">معرفی دوستان و کسب پورسانت</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-emerald-400 dark:text-emerald-500" />
          </Link>

          {/* Seller Section */}
          {isSeller && !loading && (
            <>
              {!hasStore ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 border border-amber-200 dark:border-amber-500/20 rounded-[1.5rem] p-4 flex items-center gap-4 shadow-sm"
                >
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <Store className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-amber-900 dark:text-amber-400 mb-1">فروشگاه شما ساخته نشده</h3>
                    <p className="text-[10px] text-amber-700 dark:text-amber-500/80 leading-relaxed">برای فروش کالا، ابتدا باید فروشگاه خود را بسازید</p>
                  </div>
                  <Link 
                    to="/complete-profile" 
                    className="bg-amber-500 text-white px-4 py-2.5 rounded-xl text-[11px] font-black shadow-md active:scale-95 transition-transform shrink-0"
                  >
                    ساخت فروشگاه
                  </Link>
                </motion.div>
              ) : (
                <Link 
                  to="/seller-panel" 
                  className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm border border-gray-100 dark:border-gray-800/60 active:scale-[0.98] transition-transform"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center">
                      <Store className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">پنل فروشنده</h3>
                      <p className="text-[10px] text-gray-500 mt-0.5">مدیریت کالاها و گزارشات فروشگاه</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-400" />
                </Link>
              )}
            </>
          )}

          {/* Regular User - Upgrade to Seller */}
          {!isSeller && (
            <Link 
              to="/complete-profile" 
              className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm border border-gray-100 dark:border-gray-800/60 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">فروشنده شوید</h3>
                  <p className="text-[10px] text-gray-500 mt-0.5">فروشگاه بسازید و کالا بفروشید</p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-400" />
            </Link>
          )}

          {/* Buy Badge */}
          <Link 
            to="/buy-badge" 
            className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-[1.5rem] p-4 flex items-center justify-between border border-blue-200 dark:border-blue-800/40 active:scale-[0.98] transition-transform shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-xl flex items-center justify-center">
                <BadgeCheck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-blue-900 dark:text-blue-400">خرید برچسب اعتبار</h3>
                <p className="text-[10px] text-blue-700 dark:text-blue-500/80 mt-0.5">افزایش فروش و اعتماد مشتریان</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-blue-400 dark:text-blue-500" />
          </Link>

          {/* Settings */}
          <div className="bg-white dark:bg-gray-900 rounded-[1.5rem] p-4 flex items-center justify-between shadow-sm border border-gray-100 dark:border-gray-800/60 opacity-60 grayscale cursor-not-allowed">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
                <Settings className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">تنظیمات</h3>
                <p className="text-[10px] text-gray-500 mt-0.5">به زودی در دسترس خواهد بود</p>
              </div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </div>

        </div>

        {/* Info Section */}
        <div className="mt-8 bg-white dark:bg-gray-900 rounded-[1.5rem] p-5 shadow-sm border border-gray-100 dark:border-gray-800/60">
          <h3 className="text-sm font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" /> اطلاعات کاربری
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800/60">
              <span className="text-xs text-gray-500 font-bold">شماره موبایل</span>
              <span className="text-sm font-black text-gray-900 dark:text-white tracking-wider" dir="ltr">{user.phone || "-"}</span>
            </div>
            
            <div className="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800/60">
              <span className="text-xs text-gray-500 font-bold">نوع حساب</span>
              <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg ${
                isAdmin ? "bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400" : 
                isSeller ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : 
                "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
              }`}>
                {isAdmin ? "مدیر کل" : isSeller ? "فروشنده" : "کاربر عادی"}
              </span>
            </div>

            <div className="flex justify-between items-center py-2.5">
              <span className="text-xs text-gray-500 font-bold">وضعیت فروشگاه</span>
              <span className={`text-[11px] font-black ${
                hasStore === null ? "text-gray-400" :
                hasStore ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
              }`}>
                {loading ? "در حال بررسی..." :
                 hasStore ? "فعال ✅" : 
                 "نیاز به ساخت ⚠️"}
              </span>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}