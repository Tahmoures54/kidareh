// src/context/SettingsContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { apiRequest, ApiError } from "../utils/api";
import { useAuth } from "./AuthContext";

/* ====================== TYPES ====================== */

export interface BadgeConfig {
  price: number;
  duration: number; // days
  description: string;
  color: string;
}

interface BadgeConfigs {
  [key: string]: BadgeConfig;
}

interface AppSettings {
  referralPercentage: number;
  badgeConfigs: BadgeConfigs;
  appName: string;
  maintenanceMode: boolean;
  defaultCurrency: string;
}

interface SettingsContextType extends AppSettings {
  isLoading: boolean;
  error: string | null;
  /** force=true → درخواست حتی برای غیرادمین هم ارسال می‌شود (مثلاً دکمه‌ی رفرش در پنل ادمین) */
  fetchSettings: (force?: boolean) => Promise<void>;
  updateReferralPercentage: (val: number) => Promise<void>;
  updateBadgeConfig: (badge: string, config: Partial<BadgeConfig>) => Promise<void>;
  updateSetting: <K extends keyof Omit<AppSettings, "badgeConfigs">>(
    key: K,
    value: AppSettings[K]
  ) => Promise<void>;
  resetToDefaults: () => void;
  getBadgeColor: (badgeId: string) => string;
}

/* ====================== DEFAULTS ====================== */

const defaultBadgeConfigs: BadgeConfigs = {
  "بلک فرایدی": {
    price: 50000,
    duration: 3,
    description: "پرطرفدارترین!",
    color: "bg-gray-900 text-white",
  },
  "جشنواره نوروزی": {
    price: 60000,
    duration: 20,
    description: "ویژه عید نوروز",
    color: "bg-emerald-500 text-white",
  },
  "جشنواره بهاری": {
    price: 40000,
    duration: 15,
    description: "فصل بهار",
    color: "bg-pink-500 text-white",
  },
  "جشنواره یلدا": {
    price: 45000,
    duration: 5,
    description: "شب یلدا",
    color: "bg-red-600 text-white",
  },
  "پیشنهاد ویژه": {
    price: 28000,
    duration: 5,
    description: "جلب توجه خریداران",
    color: "bg-fuchsia-500 text-white",
  },
  "پرفروش‌ترین": {
    price: 35000,
    duration: 14,
    description: "اعتبار کالا",
    color: "bg-amber-400 text-amber-950",
  },
  "حراج آخر فصل": {
    price: 30000,
    duration: 10,
    description: "پاکسازی انبار",
    color: "bg-orange-500 text-white",
  },
  "تخفیف دانشجویی": {
    price: 18000,
    duration: 30,
    description: "دانشجویان",
    color: "bg-indigo-500 text-white",
  },
  "تخفیف ویژه": {
    price: 15000,
    duration: 7,
    description: "تخفیف واقعی",
    color: "bg-rose-500 text-white",
  },
  "فروش ویژه": {
    price: 20000,
    duration: 7,
    description: "نوار طلایی",
    color: "bg-amber-500 text-white",
  },
  حراج: {
    price: 10000,
    duration: 3,
    description: "فروش سریع",
    color: "bg-purple-500 text-white",
  },
  "خرید عمده": {
    price: 40000,
    duration: 30,
    description: "فروش عمده",
    color: "bg-slate-700 text-white",
  },
  جدید: {
    price: 22000,
    duration: 7,
    description: "کالاهای تازه",
    color: "bg-cyan-500 text-white",
  },
  "موجود شد": {
    price: 12000,
    duration: 3,
    description: "اطلاع رسانی",
    color: "bg-teal-500 text-white",
  },
  "تیک آبی فروشگاه": {
    price: 200000,
    duration: 30,
    description: "تأیید هویت فروشگاه",
    color: "bg-blue-500 text-white",
  },
};

const defaultSettings: AppSettings = {
  referralPercentage: 15,
  badgeConfigs: defaultBadgeConfigs,
  appName: "کی داره؟",
  maintenanceMode: false,
  defaultCurrency: "تومان",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

/* ====================== PROVIDER ====================== */

export function SettingsProvider({ children }: { children: ReactNode }) {
  // 🔧 نمایش فوری از کش محلی — بدون انتظار برای شبکه
  // (قبلاً همه منتظر پاسخ سرور/خطای 401 می‌ماندند)
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem("app_settings");
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...defaultSettings,
          ...parsed,
          badgeConfigs: parsed?.badgeConfigs ?? defaultBadgeConfigs,
        };
      }
    } catch {}
    return defaultSettings;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🔧 endpoint ادمین است — فقط ادمین آن را صدا بزند.
  // مهمان/خریدار هرگز 401 از این مسیر نمی‌گیرد (ریشه‌ی ریدایرکت غلط به /login همین بود).
  const { isAdmin } = useAuth();

  const isMountedRef = useRef(true);
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchSettings = useCallback(
    async (force = false): Promise<void> => {
      // اگر درخواستی در حال اجراست، منتظر همان بمان (جلوگیری از درخواست موازی)
      if (fetchPromiseRef.current) return fetchPromiseRef.current;

      // 🔧 بدون نقش ادمین (مگر force از پنل ادمین) درخواستی نزن
      if (!isAdmin && !force) return;

      const promise = (async () => {
        if (!isMountedRef.current) return;

        setIsLoading(true);
        setError(null);

        try {
          const data = await apiRequest<Record<string, any>>("/api/admin/settings", {
            method: "GET",
            auth: true, // 🔧 401 اینجا فقط یعنی «نشست ادمین منقضی» — نه خطای عمومی
          });

          if (!isMountedRef.current) return;

          const loaded: AppSettings = {
            referralPercentage: data.referralPercentage
              ? Number(data.referralPercentage)
              : defaultSettings.referralPercentage,
            badgeConfigs: data.badgeConfigs
              ? typeof data.badgeConfigs === "string"
                ? JSON.parse(data.badgeConfigs)
                : data.badgeConfigs
              : defaultSettings.badgeConfigs,
            appName: data.appName || defaultSettings.appName,
            maintenanceMode: data.maintenanceMode === "true",
            defaultCurrency: data.defaultCurrency || defaultSettings.defaultCurrency,
          };

          setSettings(loaded);
          localStorage.setItem("app_settings", JSON.stringify(loaded));
        } catch (err) {
          if (!isMountedRef.current) return;

          // 🔧 401 = «دسترسی نداری» — بی‌صدا با همان کش/پیش‌فرض ادامه بده
          if (err instanceof ApiError && err.status === 401) return;

          console.error("Fetch settings error:", err);
          setError("خطا در دریافت تنظیمات");

          const saved = localStorage.getItem("app_settings");
          if (saved) {
            try {
              setSettings(JSON.parse(saved));
            } catch {}
          }
        } finally {
          if (isMountedRef.current) {
            setIsLoading(false);
          }
          fetchPromiseRef.current = null;
        }
      })();

      fetchPromiseRef.current = promise;
      return promise;
    },
    [isAdmin]
  );

  // 🔧 فقط وقتی کاربرِ ادمین شناخته شد، تنظیمات را از سرور بگیر
  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    } else {
      setIsLoading(false);
    }
  }, [isAdmin, fetchSettings]);

  /* ====================== ADMIN UPDATES ====================== */

  const updateSetting = useCallback(
    async <K extends keyof Omit<AppSettings, "badgeConfigs">>(
      key: K,
      value: AppSettings[K]
    ) => {
      await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: { [key]: value },
        auth: true,
      });

      setSettings((prev) => {
        const updated = { ...prev, [key]: value };
        localStorage.setItem("app_settings", JSON.stringify(updated));
        return updated;
      });
    },
    []
  );

  const updateReferralPercentage = useCallback(
    async (val: number) => {
      if (val < 0 || val > 100) throw new Error("درصد باید بین 0 تا 100 باشد");
      await updateSetting("referralPercentage", val);
    },
    [updateSetting]
  );

  const updateBadgeConfig = useCallback(
    async (badge: string, config: Partial<BadgeConfig>) => {
      const newBadgeConfigs = {
        ...settings.badgeConfigs,
        [badge]: { ...settings.badgeConfigs[badge], ...config },
      };

      await apiRequest("/api/admin/settings", {
        method: "PUT",
        body: { badgeConfigs: JSON.stringify(newBadgeConfigs) },
        auth: true,
      });

      setSettings((prev) => {
        const updated = { ...prev, badgeConfigs: newBadgeConfigs };
        localStorage.setItem("app_settings", JSON.stringify(updated));
        return updated;
      });
    },
    [settings.badgeConfigs]
  );

  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.setItem("app_settings", JSON.stringify(defaultSettings));
  }, []);

  const getBadgeColor = useCallback(
    (badgeId: string) => settings.badgeConfigs[badgeId]?.color || "bg-indigo-500 text-white",
    [settings.badgeConfigs]
  );

  const value: SettingsContextType = {
    ...settings,
    isLoading,
    error,
    fetchSettings,
    updateReferralPercentage,
    updateBadgeConfig,
    updateSetting,
    resetToDefaults,
    getBadgeColor,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

/* ====================== HOOK ====================== */

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (ctx === undefined)
    throw new Error("useSettings must be used within a SettingsProvider");
  return ctx;
}
