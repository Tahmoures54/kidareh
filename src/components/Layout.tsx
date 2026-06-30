// src/components/Layout.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Heart,
  MessageCircle,
  Store,
  ShieldCheck,
  Headset,
  Sparkles,
  LogOut,
  User,
  X,
  TrendingUp,
  Package,
  Grid3X3,
  ChevronLeft,
  LayoutDashboard,
  Share2,
} from "lucide-react";
import { cn } from "../utils";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import AIAssistant from "./AIAssistant";
import InstallPrompt from "./InstallPrompt";
import MagicMenu, { type MagicAction } from "./Home/MagicMenu";

/* ====================== CONSTANTS ====================== */

const BOTTOM_NAV_HEIGHT = "pb-[max(0.75rem,env(safe-area-inset-bottom))]";

const NAV_ITEMS = [
  { icon: Home, label: "خانه", path: "/" },
  { icon: Search, label: "جستجو", path: "/search" },
];

const PROFILE_MENU_ITEMS = [
  {
    icon: Heart,
    label: "علاقه‌مندی‌ها",
    path: "/saved",
    color: "text-rose-500",
    bg: "bg-rose-50",
    requiresAuth: true,
  },
  {
    icon: TrendingUp,
    label: "کسب درآمد (بازاریابی)",
    path: "/referral", // جایگزین شد
    color: "text-amber-600",
    bg: "bg-amber-50",
    requiresAuth: true,
  },
  {
    icon: Headset,
    label: "پشتیبانی",
    path: "/support",
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
  {
    icon: ShieldCheck,
    label: "قوانین و مقررات",
    path: "/terms",
    color: "text-gray-500",
    bg: "bg-gray-50",
  },
];

/* ====================== TYPES ====================== */

interface NavTabProps {
  item: {
    icon: React.ComponentType<any>;
    label: string;
    path?: string;
    badge?: boolean;
  };
  isActive: boolean;
  onClick?: () => void;
}

interface SheetItemProps {
  icon: React.ComponentType<any>;
  label: string;
  path?: string;
  onClick?: () => void;
  color?: string;
  bg?: string;
}

/* ====================== COMPONENTS ====================== */

function NavTab({ item, isActive, onClick }: NavTabProps) {
  const Icon = item.icon;

  const content = (
    <>
      <AnimatePresence>
        {isActive && (
          <motion.div
            layoutId="nav-pill"
            className="absolute inset-x-1 inset-y-0.5 bg-teal-50 rounded-2xl"
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
          />
        )}
      </AnimatePresence>

      <div className="relative flex flex-col items-center gap-1">
        <Icon
          className={cn(
            "w-5 h-5 transition-colors duration-200",
            isActive ? "text-teal-600" : "text-gray-400"
          )}
        />

        {item.badge && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-white"
          />
        )}

        <span
          className={cn(
            "text-[9px] font-black transition-colors",
            isActive ? "text-teal-600" : "text-gray-400"
          )}
        >
          {item.label}
        </span>
      </div>
    </>
  );

  const className =
    "relative flex-1 flex flex-col items-center justify-center py-2 px-1 active:scale-90 transition-transform rounded-2xl";

  return onClick ? (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={className}
      aria-label={item.label}
    >
      {content}
    </motion.button>
  ) : (
    <Link to={item.path || "/"} className={className} aria-label={item.label}>
      {content}
    </Link>
  );
}

function SheetItem({
  icon: Icon,
  label,
  path,
  onClick,
  color = "text-gray-500",
  bg = "bg-gray-50",
}: SheetItemProps) {
  
  const handleClick = (e: React.MouseEvent) => {
    if (onClick) onClick();
  };

  const Content = (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-2xl transition-all">
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center border border-gray-100 flex-shrink-0",
          bg
        )}
      >
        <Icon className={cn("w-5 h-5", color)} />
      </div>
      <span className="flex-1 text-sm font-bold text-gray-700">{label}</span>
      <ChevronLeft className="w-4 h-4 text-gray-300 flex-shrink-0" />
    </div>
  );

  return (
    <motion.div whileHover={{ x: -4 }} whileTap={{ scale: 0.98 }}>
      {path ? (
        <Link to={path} onClick={handleClick}>
          {Content}
        </Link>
      ) : (
        <button className="w-full text-right" onClick={handleClick}>
          {Content}
        </button>
      )}
    </motion.div>
  );
}

function UserCard({ user, onClose }: { user: any; onClose: () => void; }) {
  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, { emoji: string; label: string }> = {
      admin: { emoji: "👑", label: "مدیر" },
      seller: { emoji: "🏪", label: "فروشنده" },
      support: { emoji: "🎧", label: "پشتیبان" },
      referrer: { emoji: "📢", label: "بازاریاب" },
    };
    return roleMap[role] || { emoji: "👤", label: "کاربر" };
  };

  const roleInfo = getRoleLabel(user.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-3xl mb-6"
    >
      <div className="w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-teal-200 flex-shrink-0">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt={user.name} className="w-full h-full rounded-2xl object-cover" />
        ) : user.name ? (
          user.name.charAt(0)
        ) : (
          <User className="w-7 h-7" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-black text-gray-900 truncate text-base">
          {user.name || "کاربر عزیز"}
        </h3>
        <p className="text-xs text-gray-500 font-bold mt-0.5">{user.phone}</p>

        {user.role !== "buyer" && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="inline-block mt-2 text-[9px] bg-teal-600 text-white px-2.5 py-1 rounded-full font-bold"
          >
            {roleInfo.emoji} {roleInfo.label}
          </motion.span>
        )}
      </div>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClose}
        className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm flex-shrink-0 hover:text-gray-600"
        aria-label="بستن"
      >
        <X className="w-5 h-5" />
      </motion.button>
    </motion.div>
  );
}

function GuestCard({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center p-6 bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-3xl mb-6"
    >
      <div className="w-16 h-16 bg-teal-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
        <User className="w-8 h-8 text-teal-600" />
      </div>
      <p className="text-sm font-bold text-gray-700 mb-4">
        برای دسترسی به تمام امکانات ورود کنید
      </p>
      <Link
        to="/login"
        onClick={onClose}
        className="inline-block bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-3 rounded-xl text-sm font-bold shadow-lg shadow-teal-200 hover:shadow-xl hover:shadow-teal-300 active:scale-95 transition-all"
      >
        ورود / ثبت‌نام
      </Link>
    </motion.div>
  );
}

/* ====================== MAIN LAYOUT ====================== */

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isLoading } = useAuth();

  const [magicOpen, setMagicOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const isSeller = user?.role === "seller" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    setMagicOpen(false);
    setSheetOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!magicOpen && !sheetOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMagicOpen(false);
        setSheetOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [magicOpen, sheetOpen]);

  const handleShareApp = async () => {
    setSheetOpen(false); 
    
    const appUrl = window.location.origin;
    const shareMessage = `ببین کی داره؟ حضوری بگیر! 🚀\n\nبا «کی‌داره» می‌تونی کالای مورد نیازت رو تو فروشگاه‌های اطراف خودت پیدا کنی و مستقیم و سریع خرید کنی.\n\nهمین الان روی لینک زیر کلیک کن 👇\n${appUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "اپلیکیشن کی‌داره 🛍️",
          text: shareMessage,
        });
      } catch (error) {
        console.log("اشتراک‌گذاری لغو شد.");
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareMessage);
        alert("متن معرفی و لینک کی‌داره در حافظه کپی شد. می‌توانید آن را برای دوستانتان بفرستید! 🎉");
      } catch (err) {
        console.error("خطا در کپی پیام");
      }
    }
  };

  const magicActions = useMemo<MagicAction[]>(() => {
    const actions: MagicAction[] = [];
    
    const go = (path: string) => {
      setMagicOpen(false);
      navigate(path);
    };

    if (isSeller) {
      actions.push({
        icon: LayoutDashboard,
        label: "فروشگاه من",
        color: "bg-gradient-to-br from-emerald-500 to-teal-600",
        onClick: () => go("/seller"),
      });
      actions.push({
        icon: Package,
        label: "ثبت کالای جدید",
        color: "bg-gradient-to-br from-blue-500 to-indigo-600",
        onClick: () => go("/add-product"),
      });
    } else if (user) {
      actions.push({
        icon: Store,
        label: "ثبت فروشگاه",
        color: "bg-gradient-to-br from-amber-500 to-orange-600",
        onClick: () => go("/complete-profile"),
      });
    }

    actions.push({
      icon: Grid3X3,
      label: "دسته‌بندی‌ها",
      color: "bg-gradient-to-br from-cyan-500 to-sky-600",
      onClick: () => go("/categories"),
    });

    actions.push({
      icon: Store,
      label: "فروشگاه‌ها",
      color: "bg-gradient-to-br from-orange-400 to-amber-500",
      onClick: () => go("/stores"),
    });

    actions.push({
      icon: Sparkles,
      label: "دستیار هوشمند",
      color: "bg-gradient-to-br from-violet-500 to-purple-600",
      onClick: () => go("/ai"),
    });

    if (user) {
      actions.push({
        icon: Heart,
        label: "علاقه‌مندی‌ها",
        color: "bg-gradient-to-br from-rose-500 to-pink-600",
        onClick: () => go("/saved"),
      });
    }

    actions.push({
      icon: TrendingUp,
      label: "کسب درآمد",
      color: "bg-gradient-to-br from-fuchsia-500 to-pink-600",
      onClick: () => go("/referral"), // جایگزین شد
    });

    actions.push({
      icon: Headset,
      label: "پشتیبانی",
      color: "bg-gradient-to-br from-slate-500 to-gray-700",
      onClick: () => go("/support"),
    });

    if (isAdmin) {
      actions.push({
        icon: ShieldCheck,
        label: "پنل ادمین",
        color: "bg-gradient-to-br from-indigo-500 to-blue-700",
        onClick: () => go("/admin"),
      });
    }

    return actions;
  }, [user, isSeller, isAdmin, navigate]);

  const profileMenuItems = useMemo(() => {
    let items = [...PROFILE_MENU_ITEMS];

    if (isSeller && user) {
      items = [
        {
          icon: LayoutDashboard,
          label: "پنل مدیریت فروشگاه",
          path: "/seller",
          color: "text-emerald-600",
          bg: "bg-emerald-50",
          requiresAuth: true,
        },
        ...items,
      ];
    }

    if (isAdmin && user) {
      items = [
        ...items.slice(0, -1),
        {
          icon: ShieldCheck,
          label: "پنل مدیریت سایت",
          path: "/admin",
          color: "text-indigo-600",
          bg: "bg-indigo-50",
          requiresAuth: true,
        },
        ...items.slice(-1),
      ];
    }

    return items.filter((item) => !item.requiresAuth || user);
  }, [user, isSeller, isAdmin]);

  const isActive = useCallback(
    (path: string) => {
      if (path === "/") return location.pathname === "/";
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    },
    [location.pathname]
  );

  const handleMagicToggle = useCallback(() => {
    setMagicOpen((prev) => !prev);
    setSheetOpen(false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      setSheetOpen(false);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("Logout failed:", err);
    }
  }, [logout, navigate]);

  const handleSheetToggle = useCallback(() => {
    if (user) {
      setSheetOpen(true);
      setMagicOpen(false);
    } else {
      navigate("/login");
    }
  }, [user, navigate]);

  return (
    <div
      className="flex flex-col h-[100dvh] w-full max-w-md bg-gray-50 font-sans overflow-hidden relative shadow-2xl"
      dir="rtl"
    >
      <InstallPrompt />

      <main className="flex-1 overflow-y-auto hide-scrollbar">
        <Outlet />
      </main>

      <MagicMenu actions={magicActions} isOpen={magicOpen} onToggle={handleMagicToggle} />

      <nav
        className={cn(
          "relative z-40 bg-white/95 backdrop-blur-xl",
          "border-t border-gray-100",
          "shadow-[0_-4px_20px_rgba(0,0,0,0.04)]",
          BOTTOM_NAV_HEIGHT
        )}
        aria-label="ناوبری اصلی"
      >
        <div className="flex items-center px-2 pt-1.5 pb-1">
          {NAV_ITEMS.map((item) => (
            <NavTab key={item.path} item={item} isActive={isActive(item.path)} />
          ))}

          <div className="flex-1 flex justify-center">
            <div className="w-14" />
          </div>

          <NavTab
            item={{ icon: MessageCircle, label: "پیام‌ها", path: "/messages", badge: true }}
            isActive={isActive("/messages")}
          />

          <NavTab
            item={{ icon: User, label: user ? "پروفایل" : "ورود" }}
            isActive={sheetOpen || isActive("/profile")}
            onClick={handleSheetToggle}
          />
        </div>
      </nav>

      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSheetOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            />

            <motion.div
              key="sheet-content"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-50 bg-white rounded-t-[2.5rem] shadow-2xl flex flex-col pb-[max(1.5rem,env(safe-area-inset-bottom))] max-h-[85vh]"
              role="dialog"
              aria-modal="true"
              aria-label="منوی پروفایل"
            >
              <motion.div
                whileHover={{ opacity: 0.7 }}
                className="flex justify-center py-4 cursor-pointer"
                onClick={() => setSheetOpen(false)}
              >
                <div className="w-12 h-1.5 bg-gray-200 rounded-full" />
              </motion.div>

              <div className="overflow-y-auto hide-scrollbar px-6 flex-1 pb-4">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-8 h-8 border-2 border-teal-200 border-t-teal-600 rounded-full"
                    />
                  </div>
                ) : user ? (
                  <UserCard user={user} onClose={() => setSheetOpen(false)} />
                ) : (
                  <GuestCard onClose={() => setSheetOpen(false)} />
                )}

                {profileMenuItems.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {profileMenuItems.map((item) => (
                      <SheetItem
                        key={item.label}
                        icon={item.icon}
                        label={item.label}
                        path={item.path}
                        color={item.color}
                        bg={item.bg}
                      />
                    ))}
                  </div>
                )}
                
                <div className="space-y-1.5 mb-6">
                  <SheetItem
                    icon={Share2}
                    label="معرفی به دوستان"
                    color="text-blue-500"
                    bg="bg-blue-50"
                    onClick={handleShareApp}
                  />
                </div>

                {user && (
                  <div className="border-t border-gray-100 pt-4">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2.5 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all"
                    >
                      <LogOut className="w-4 h-4" />
                      خروج از حساب کاربری
                    </motion.button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AIAssistant isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}