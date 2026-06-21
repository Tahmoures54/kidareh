import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, Heart, MessageCircle, Store, ShieldCheck, 
  Wallet, Headset, Sparkles, LogOut, User, X, TrendingUp,
  Settings, Package, BarChart3
} from "lucide-react";
import { cn } from "../utils";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";
import AIAssistant from "./AIAssistant";
import InstallPrompt from "./InstallPrompt";

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();
  
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // گوش دادن به event باز کردن AI
  useEffect(() => {
    const handleOpenAI = () => setIsAIOpen(true);
    window.addEventListener("open-ai-assistant", handleOpenAI);
    return () => window.removeEventListener("open-ai-assistant", handleOpenAI);
  }, []);

  // دریافت تعداد پیام‌های خوانده نشده
  useEffect(() => {
    if (user) {
      // TODO: دریافت از API
      // fetch('/api/messages/unread-count')
      setUnreadMessages(3);
    }
  }, [user]);

  // بستن منوی بیشتر با ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    
    if (isMoreMenuOpen) {
      window.addEventListener('keydown', handleEscape);
      return () => window.removeEventListener('keydown', handleEscape);
    }
  }, [isMoreMenuOpen]);

  // لینک‌های اصلی نوار پایین
  const mainNavItems = [
    { icon: Home, label: "خانه", path: "/" },
    { icon: Search, label: "جستجو", path: "/search" },
    // وسط: دکمه AI
    { icon: MessageCircle, label: "پیام‌ها", path: "/messages", badge: unreadMessages },
    { icon: User, label: "پروفایل", path: user ? "/seller" : "/login", action: 'profile' },
  ];

  // لینک‌های منوی بیشتر
  const getMoreNavItems = () => {
    const items = [];

    if (user?.role === 'seller' || user?.role === 'admin') {
      items.push(
        { icon: Store, label: "ویترین فروشگاه من", path: "/seller" },
        { icon: Package, label: "افزودن کالا", path: "/add-product" }
      );
    }

    items.push(
      { icon: Wallet, label: "کیف پول و درآمد", path: "/wallet" },
      { icon: Heart, label: "نشان‌های من", path: "/saved", badge: true },
      { icon: TrendingUp, label: "خرید بسته ویژه", path: "/buy-badge" }
    );

    if (user?.role === 'admin' || user?.role === 'support') {
      items.push(
        { icon: ShieldCheck, label: "پنل مدیریت", path: "/admin" },
        { icon: BarChart3, label: "آمار و گزارشات", path: "/admin/stats" }
      );
    }

    items.push(
      { icon: Settings, label: "تنظیمات", path: "/settings" },
      { icon: Headset, label: "پشتیبانی ۲۴/۷", path: "/support" }
    );

    return items;
  };

  const moreNavItems = getMoreNavItems();

  const handleLogout = async () => {
    try {
      setIsMoreMenuOpen(false);
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 text-gray-900 font-sans mx-auto max-w-md shadow-2xl overflow-hidden relative" dir="rtl">
      {/* PWA Install Prompt */}
      <InstallPrompt />
      
      {/* محتوای اصلی */}
      <main className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
        <Outlet />
      </main>

      {/* نوار ناوبری پایین */}
      <nav 
        className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        role="navigation"
        aria-label="نوار ناوبری اصلی"
      >
        <div className="flex items-center justify-around px-2 py-2 relative">
          
          {/* دو آیتم سمت راست */}
          {mainNavItems.slice(0, 2).map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.label} 
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-1 p-2 relative group"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator" 
                    className="absolute -top-2 w-8 h-1 bg-indigo-600 rounded-b-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <item.icon className={cn(
                  "w-6 h-6 transition-all duration-300",
                  isActive ? "text-indigo-600 scale-110" : "text-gray-400 group-hover:text-gray-600 group-active:scale-95"
                )} />
                <span className={cn(
                  "text-[10px] font-bold transition-all",
                  isActive ? "text-indigo-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* دکمه مرکزی شناور (هوش مصنوعی) */}
          <div className="flex-1 flex justify-center -mt-8 relative z-50">
            <div className="bg-gray-50 rounded-full p-1.5 shadow-[0_-5px_15px_rgba(0,0,0,0.1)] border-t border-gray-100">
              <motion.button
                onClick={() => setIsAIOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-fuchsia-500 flex items-center justify-center text-white shadow-[0_10px_25px_rgba(79,70,229,0.4)] relative overflow-hidden group"
                aria-label="دستیار هوش مصنوعی"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <Sparkles className="w-7 h-7 relative z-10" />
                <span className="absolute inset-0 rounded-full bg-white/30 animate-ping" />
              </motion.button>
            </div>
          </div>

          {/* دو آیتم سمت چپ */}
          {mainNavItems.slice(2, 4).map((item) => {
            const isActive = location.pathname === item.path || (item.action === 'profile' && isMoreMenuOpen);
            
            if (item.action === 'profile') {
              return (
                <button 
                  key={item.label} 
                  onClick={() => {
                    if (user) {
                      setIsMoreMenuOpen(true);
                    } else {
                      navigate('/login');
                    }
                  }}
                  className="flex-1 flex flex-col items-center justify-center gap-1 p-2 relative group"
                  aria-label={item.label}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="nav-indicator" 
                      className="absolute -top-2 w-8 h-1 bg-indigo-600 rounded-b-full"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <div className="relative">
                    <item.icon className={cn(
                      "w-6 h-6 transition-all duration-300",
                      isActive ? "text-indigo-600 scale-110" : "text-gray-400 group-hover:text-gray-600"
                    )} />
                    {user && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold transition-all",
                    isActive ? "text-indigo-600" : "text-gray-500"
                  )}>
                    {item.label}
                  </span>
                </button>
              );
            }

            return (
              <Link 
                key={item.label} 
                to={item.path}
                className="flex-1 flex flex-col items-center justify-center gap-1 p-2 relative group"
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.div 
                    layoutId="nav-indicator" 
                    className="absolute -top-2 w-8 h-1 bg-indigo-600 rounded-b-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <div className="relative">
                  <item.icon className={cn(
                    "w-6 h-6 transition-all duration-300",
                    isActive ? "text-indigo-600 scale-110" : "text-gray-400 group-hover:text-gray-600"
                  )} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-white">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] font-bold transition-all",
                  isActive ? "text-indigo-600" : "text-gray-500"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* منوی پروفایل (Bottom Sheet) */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsMoreMenuOpen(false)}
              aria-hidden="true"
            />
            
            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }} 
              animate={{ y: 0 }} 
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-50 bg-white rounded-t-[2rem] shadow-2xl flex flex-col pb-[max(1rem,env(safe-area-inset-bottom))]"
              role="dialog"
              aria-modal="true"
              aria-label="منوی پروفایل"
            >
              {/* Handle Bar */}
              <div className="flex justify-center pt-3 pb-2 w-full cursor-pointer" onClick={() => setIsMoreMenuOpen(false)}>
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </div>
              
              <div className="px-5 pb-4 max-h-[80vh] overflow-y-auto scrollbar-hide">
                {/* User Header Profile */}
                {user ? (
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl mb-6 border border-indigo-100">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-lg shadow-indigo-200">
                      {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-gray-900 truncate">{user.name || 'کاربر'}</h3>
                      <p className="text-[10px] text-gray-500 font-bold mt-1 truncate" dir="ltr">{user.phone}</p>
                      {user.role !== 'buyer' && (
                        <span className="inline-block text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded-full mt-1 font-bold">
                          {user.role === 'admin' ? '👑 مدیر' : user.role === 'seller' ? '🏪 فروشنده' : user.role}
                        </span>
                      )}
                    </div>
                    <button 
                      onClick={() => setIsMoreMenuOpen(false)} 
                      className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 shadow-sm transition-colors"
                      aria-label="بستن منو"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-2xl mb-6 text-center">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-medium mb-3">برای دسترسی به امکانات بیشتر وارد شوید</p>
                    <Link
                      to="/login"
                      onClick={() => setIsMoreMenuOpen(false)}
                      className="inline-block bg-indigo-600 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
                    >
                      ورود / ثبت نام
                    </Link>
                  </div>
                )}

                {/* Menu Items */}
                <div className="space-y-2">
                  {moreNavItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      onClick={() => setIsMoreMenuOpen(false)}
                      className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 bg-gray-50 group-hover:bg-white text-gray-500 group-hover:text-indigo-600 rounded-xl flex items-center justify-center shadow-sm transition-colors border border-gray-100 group-hover:border-indigo-100 relative">
                        <item.icon className="w-5 h-5" />
                        {item.badge && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <span className="font-bold text-sm text-gray-700 group-hover:text-gray-900 transition-colors flex-1">
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>

                {/* Logout Button */}
                {user && (
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                    <button
                      onClick={handleLogout}
                      disabled={isLoading}
                      className="w-full flex items-center justify-center gap-2 p-4 bg-rose-50 text-rose-600 rounded-2xl text-sm font-black hover:bg-rose-500 hover:text-white transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogOut className="w-5 h-5" />
                      {isLoading ? 'در حال خروج...' : 'خروج از حساب کاربری'}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Assistant */}
      <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}