import React, { memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, Store as StoreIcon, MapPin, ChevronDown, User, Plus } from "lucide-react";
import { AppUser } from "../constants";

interface HeaderProps {
  user: AppUser | null;
  effectiveCity: string;
  effectiveDisplay: string;
  gpsEnabled: boolean;
  manualLocation: any;
  onOpenLocationModal: () => void;
}

export const Header = memo(({ 
  user, 
  effectiveCity, 
  effectiveDisplay, 
  gpsEnabled, 
  manualLocation, 
  onOpenLocationModal 
}: HeaderProps) => {
  const navigate = useNavigate();
  const isSeller = user?.role === "seller" || user?.role === "admin";

  return (
    <header 
      className="sticky top-0 z-40 bg-white/95 dark:bg-[#0B0F19]/95 backdrop-blur-xl border-b border-gray-200/80 dark:border-gray-800/50"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        
        {/* انتخاب شهر */}
        <button 
          onClick={onOpenLocationModal}
          aria-label="انتخاب شهر"
          className="flex items-center gap-1.5 text-sm font-bold text-[var(--text-primary)] min-w-0 active:scale-95 transition-transform hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-2 py-1.5 -mr-2"
        >
          <MapPin className={`w-5 h-5 shrink-0 ${gpsEnabled && !manualLocation ? 'text-green-500' : 'text-[var(--brand-primary)]'}`} />
          <span className="truncate max-w-[100px]">{effectiveCity}</span>
          <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
        </button>

        {/* لوگو */}
        <Link to="/" className="text-lg font-black text-[var(--text-primary)] hover:text-rose-600 transition-colors">
          کی‌داره؟
        </Link>

        {/* آیکون‌های سمت چپ */}
        <div className="flex items-center gap-2">
          {isSeller && (
            <Link 
              to="/seller" 
              aria-label="پنل فروشنده"
              className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
            >
              <StoreIcon className="w-5 h-5" />
            </Link>
          )}
          
          <button 
            onClick={() => navigate("/messages")} 
            aria-label="پیام‌ها"
            className="relative p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
          >
            <Bell className="w-5 h-5" />
            {/* نقطه اعلان */}
            {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" /> */}
          </button>

          <button 
            onClick={() => navigate(user ? "/profile" : "/login")} 
            aria-label={user ? "پروفایل" : "ورود"}
            className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--brand-primary)] hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-90"
          >
            {user ? (
              user.avatar_url ? (
                <img src={user.avatar_url} alt={user.name} className="w-6 h-6 rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )
            ) : (
              <Plus className="w-5 h-5 text-[var(--brand-primary)]" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
});

Header.displayName = "Header";
