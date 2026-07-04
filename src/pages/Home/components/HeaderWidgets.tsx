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
  onCityChange: (city: string, display: string, province: string) => void;
  onOpenLocationModal: () => void;
}

export const Header = memo(({ 
  user, effectiveCity, effectiveDisplay, gpsEnabled, manualLocation, onCityChange, onOpenLocationModal 
}: HeaderProps) => {
  const navigate = useNavigate();
  const isSeller = user?.role === "seller" || user?.role === "admin";

  return (
    <header 
      className="sticky top-0 z-40 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800/50"
      style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
    >
      <div className="flex items-center justify-between h-14 px-4">
        
        <button 
          onClick={onOpenLocationModal}
          aria-label="انتخاب شهر"
          className="flex items-center gap-1.5 text-sm font-bold text-gray-800 dark:text-white min-w-0 active:scale-95 transition-transform"
        >
          <MapPin className="w-5 h-5 text-indigo-500 shrink-0" />
          <span className="truncate max-w-[100px]">{effectiveCity}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </button>

        <Link to="/" className="text-lg font-black text-gray-900 dark:text-white">
          کی‌داره؟
        </Link>

        <div className="flex items-center gap-3">
          {isSeller && (
            <Link 
              to="/seller" 
              aria-label="پنل فروشنده"
              className="text-gray-600 dark:text-gray-300 hover:text-indigo-500 transition-colors active:scale-90"
            >
              <StoreIcon className="w-6 h-6" />
            </Link>
          )}
          
          <button 
            onClick={() => navigate("/messages")} 
            aria-label="پیام‌ها"
            className="relative text-gray-600 dark:text-gray-300 hover:text-indigo-500 transition-colors active:scale-90"
          >
            <Bell className="w-6 h-6" />
          </button>

          <button 
            onClick={() => navigate(user ? "/profile" : "/login")} 
            aria-label={user ? "پروفایل" : "ورود"}
            className="text-gray-600 dark:text-gray-300 hover:text-indigo-500 transition-colors active:scale-90"
          >
            {user ? <User className="w-6 h-6" /> : <Plus className="w-6 h-6 text-indigo-500" />}
          </button>
        </div>
      </div>
    </header>
  );
});