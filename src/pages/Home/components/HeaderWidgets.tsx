import React, { memo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  Store as StoreIcon,
  MapPin,
  ChevronDown,
  User,
  LogIn,
} from "lucide-react";
import { AppUser, ManualLocation, HOME_CONFIG } from "../constants";

interface HeaderProps {
  user: AppUser | null;
  effectiveCity: string;
  effectiveDisplay: string;
  gpsEnabled: boolean;
  manualLocation: ManualLocation | null;
  onOpenLocationModal: () => void;
  hasNotifications?: boolean; // پراپ جدید برای نشان دادن نقطه اعلان
}

// کلاس‌های مشترک برای دکمه‌های آیکونی
const ICON_BUTTON_CLASS =
  "p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90";

export const Header = memo(
  ({
    user,
    effectiveCity,
    effectiveDisplay,
    gpsEnabled,
    manualLocation,
    onOpenLocationModal,
    hasNotifications = false,
  }: HeaderProps) => {
    const navigate = useNavigate();
    const isSeller = user?.role === "seller" || user?.role === "admin";

    // استفاده از useCallback برای جلوگیری از ساخت تابع در هر رندر
    const handleNavigateToMessages = useCallback(() => {
      navigate("/messages");
    }, [navigate]);

    const handleNavigateToProfile = useCallback(() => {
      navigate(user ? "/profile" : "/login");
    }, [navigate, user]);

    const handleAvatarError = useCallback(
      (e: React.SyntheticEvent<HTMLImageElement>) => {
        e.currentTarget.style.display = "none";
        // می‌توان fallback icon را نشان داد، اما در اینجا با مخفی کردن تصویر، آیکون کاربر از قبل وجود دارد
      },
      []
    );

    return (
      <header
        className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/50"
        style={{ paddingTop: "max(0px, env(safe-area-inset-top))" }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* انتخاب شهر */}
          <button
            onClick={onOpenLocationModal}
            aria-label="انتخاب شهر"
            title={effectiveDisplay}
            className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)] min-w-0 active:scale-95 transition-transform hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 -mr-2"
          >
            <MapPin
              className={`w-5 h-5 shrink-0 ${
                gpsEnabled && !manualLocation
                  ? "text-green-500"
                  : "text-[var(--brand-primary)]"
              }`}
            />
            <span
              className="truncate"
              style={{ maxWidth: HOME_CONFIG.HEADER_CITY_MAX_WIDTH }}
            >
              {effectiveCity}
            </span>
            <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
          </button>

          {/* لوگو */}
          <Link
            to="/"
            className="text-lg font-black text-[var(--text-primary)] hover:text-rose-600 transition-colors"
          >
            کی‌داره؟
          </Link>

          {/* آیکون‌های سمت چپ */}
          <div className="flex items-center gap-2">
            {isSeller && (
              <Link
                to="/seller"
                aria-label="پنل فروشنده"
                title="پنل فروشنده"
                className={ICON_BUTTON_CLASS}
              >
                <StoreIcon className="w-5 h-5" />
              </Link>
            )}

            <button
              onClick={handleNavigateToMessages}
              aria-label="پیام‌ها"
              title="پیام‌ها"
              className={`relative ${ICON_BUTTON_CLASS}`}
            >
              <Bell className="w-5 h-5" />
              {hasNotifications && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
              )}
            </button>

            <button
              onClick={handleNavigateToProfile}
              aria-label={user ? "پروفایل" : "ورود"}
              title={user ? "پروفایل" : "ورود"}
              className={ICON_BUTTON_CLASS}
            >
              {user ? (
                user.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name || "کاربر"}
                    className="w-6 h-6 rounded-full object-cover"
                    onError={handleAvatarError}
                  />
                ) : (
                  <User className="w-5 h-5" />
                )
              ) : (
                <LogIn className="w-5 h-5 text-[var(--brand-primary)]" />
              )}
            </button>
          </div>
        </div>
      </header>
    );
  }
);

Header.displayName = "Header";
