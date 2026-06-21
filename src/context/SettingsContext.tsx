import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';

// ==========================================
// 1. Types & Interfaces
// ==========================================
export interface BadgeConfig {
  price: number;
  duration: number; // in days
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
  fetchSettings: () => Promise<void>;
  updateReferralPercentage: (val: number) => Promise<void>;
  updateBadgeConfig: (badge: string, config: Partial<BadgeConfig>) => Promise<void>;
  updateSetting: <K extends keyof Omit<AppSettings, 'badgeConfigs'>>(key: K, value: AppSettings[K]) => Promise<void>;
  resetToDefaults: () => void;
  getBadgeColor: (badgeId: string) => string;
}

// ==========================================
// 2. Default Configurations
// ==========================================
const defaultBadgeConfigs: BadgeConfigs = {
  'بلک فرایدی': {
    price: 50000,
    duration: 3,
    description: 'پرطرفدارترین! فروش خود را در روزهای خاص چندبرابر کنید.',
    color: 'bg-gray-900 text-white'
  },
  'جشنواره نوروزی': {
    price: 60000,
    duration: 20,
    description: 'بزرگترین رویداد فروش سال ویژه عید نوروز.',
    color: 'bg-emerald-500 text-white'
  },
  'جشنواره بهاری': {
    price: 40000,
    duration: 15,
    description: 'ویژه فروش‌های نوروزی و فصل بهار با بازدید بالا.',
    color: 'bg-pink-500 text-white'
  },
  'جشنواره یلدا': {
    price: 45000,
    duration: 5,
    description: 'فروش شگفت‌انگیز برای شب یلدا و تخفیف‌های ویژه.',
    color: 'bg-red-600 text-white'
  },
  'پيشنهاد ويژه': {
    price: 28000,
    duration: 5,
    description: 'جلب توجه خریداران برای بهترین کالاها.',
    color: 'bg-fuchsia-500 text-white'
  },
  'پرفروش‌ترین': {
    price: 35000,
    duration: 14,
    description: 'نشان دادن اعتبار و محبوبیت کالای شما.',
    color: 'bg-amber-400 text-amber-950'
  },
  'حراج آخر فصل': {
    price: 30000,
    duration: 10,
    description: 'ایده‌آل برای پاکسازی انبار در انتهای فصل.',
    color: 'bg-orange-500 text-white'
  },
  'تخفیف دانشجویی': {
    price: 18000,
    duration: 30,
    description: 'جذب قشر دانشجو با تخفیف‌های خاص.',
    color: 'bg-indigo-500 text-white'
  },
  'تخفیف ویژه': {
    price: 15000,
    duration: 7,
    description: 'مناسب برای کالاهایی که تخفیف واقعی دارند.',
    color: 'bg-rose-500 text-white'
  },
  'فروش ویژه': {
    price: 20000,
    duration: 7,
    description: 'جلب توجه خریداران با نوار طلایی رنگ.',
    color: 'bg-amber-500 text-white'
  },
  'حراج': {
    price: 10000,
    duration: 3,
    description: 'برای فروش سریع کالاهای تک سایز یا آخر بار.',
    color: 'bg-purple-500 text-white'
  },
  'خرید عمده': {
    price: 40000,
    duration: 30,
    description: 'نمایش امکان فروش عمده با قیمت کمتر.',
    color: 'bg-slate-700 text-white'
  },
  'جدید': {
    price: 22000,
    duration: 7,
    description: 'معرفی کالاهای تازه وارد شده به صورت چشمگیر.',
    color: 'bg-cyan-500 text-white'
  },
  'موجود شد': {
    price: 12000,
    duration: 3,
    description: 'اطلاع رسانی سریع برای کالاهای پرمخاطب.',
    color: 'bg-teal-500 text-white'
  }
};

const defaultSettings: AppSettings = {
  referralPercentage: 15,
  badgeConfigs: defaultBadgeConfigs,
  appName: 'کی داره؟',
  maintenanceMode: false,
  defaultCurrency: 'تومان'
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ==========================================
  // 3. Fetch Settings from Backend
  // ==========================================
  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings from server');
      }

      const data = await response.json();

      // Normalize settings from backend
      const loadedSettings: AppSettings = {
        referralPercentage: data.referralPercentage
          ? Number(data.referralPercentage)
          : defaultSettings.referralPercentage,
        badgeConfigs: data.badgeConfigs
          ? JSON.parse(data.badgeConfigs)
          : defaultSettings.badgeConfigs,
        appName: data.appName || defaultSettings.appName,
        maintenanceMode: data.maintenanceMode
          ? data.maintenanceMode === 'true'
          : defaultSettings.maintenanceMode,
        defaultCurrency: data.defaultCurrency || defaultSettings.defaultCurrency
      };

      setSettings(loadedSettings);
      // Save to localStorage as fallback
      localStorage.setItem('app_settings', JSON.stringify(loadedSettings));
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('خطا در دریافت تنظیمات از سرور. از تنظیمات پیش‌فرض استفاده می‌شود.');

      // Try to load from localStorage
      const saved = localStorage.getItem('app_settings');
      if (saved) {
        try {
          setSettings(JSON.parse(saved));
        } catch (parseErr) {
          console.error('Error parsing saved settings:', parseErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ==========================================
  // 4. Update Functions
  // ==========================================

  // Generic setting updater
  const updateSetting = useCallback(async <K extends keyof Omit<AppSettings, 'badgeConfigs'>>(
    key: K,
    value: AppSettings[K]
  ) => {
    try {
      // Validate value based on key
      if (key === 'referralPercentage' && (value as number < 0 || value as number > 100)) {
        throw new Error('درصد باید بین 0 تا 100 باشد');
      }

      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update setting on server');
      }

      setSettings(prev => ({
        ...prev,
        [key]: value,
      }));

      // Update localStorage
      const updatedSettings = { ...settings, [key]: value };
      localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
    } catch (err) {
      console.error(`Error updating setting ${key}:`, err);
      throw err;
    }
  }, [settings]);

  // Specialized function for referral percentage
  const updateReferralPercentage = useCallback(async (val: number) => {
    if (val < 0 || val > 100) {
      throw new Error('درصد باید بین 0 تا 100 باشد');
    }
    await updateSetting('referralPercentage', val);
  }, [updateSetting]);

  // Specialized function for badge configs
  const updateBadgeConfig = useCallback(async (badge: string, config: Partial<BadgeConfig>) => {
    try {
      // Validate new values
      if (config.price !== undefined && config.price < 0) {
        throw new Error('قیمت نمی‌تواند منفی باشد');
      }
      if (config.duration !== undefined && config.duration < 1) {
        throw new Error('مدت زمان باید حداقل 1 روز باشد');
      }

      // First update backend
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          badgeConfigs: JSON.stringify({
            ...settings.badgeConfigs,
            [badge]: { ...settings.badgeConfigs[badge], ...config }
          })
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update badge config on server');
      }

      // Then update local state
      setSettings(prev => {
        const updatedBadgeConfigs = {
          ...prev.badgeConfigs,
          [badge]: { ...prev.badgeConfigs[badge], ...config }
        };
        const updatedSettings = {
          ...prev,
          badgeConfigs: updatedBadgeConfigs
        };
        localStorage.setItem('app_settings', JSON.stringify(updatedSettings));
        return updatedSettings;
      });
    } catch (err) {
      console.error('Error updating badge config:', err);
      throw err;
    }
  }, [settings]);

  // Reset to default values
  const resetToDefaults = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.setItem('app_settings', JSON.stringify(defaultSettings));
  }, []);

  // Helper function to get badge color
  const getBadgeColor = useCallback((badgeId: string) => {
    return settings.badgeConfigs[badgeId]?.color || 'bg-indigo-500 text-white';
  }, [settings.badgeConfigs]);

  // ==========================================
  // 5. Provider Value
  // ==========================================
  const value: SettingsContextType = {
    ...settings,
    isLoading,
    error,
    fetchSettings,
    updateReferralPercentage,
    updateBadgeConfig,
    updateSetting,
    resetToDefaults,
    getBadgeColor
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}