// src/components/InstallPrompt.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Download,
  X,
  Smartphone,
  Share2,
  Plus,
  ArrowUp,
  Sparkles,
} from "lucide-react";
// اصلاح آدرس ایمپورت framer-motion برای جلوگیری از خطای بیلد
import { motion, AnimatePresence } from "framer-motion";

/* ====================== TYPES ====================== */

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/* ====================== CONSTANTS ====================== */

const SNOOZE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
const PROMPT_DELAY = 5000; // 5 seconds

/* ====================== HELPERS ====================== */

/**
 * بررسی وجود web app (حالت Standalone)
 */
function isAppInstalled(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true
  );
}

/**
 * بررسی iOS
 */
function isIOS(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

/* ====================== INSTALL PROMPT COMPONENT ====================== */

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  /**
   * Initialize
   */
  useEffect(() => {
    // 1. اگر اپلیکیشن در حالت نصب شده باز است یا قبلاً تایید نصب داده، اصلاً کد اجرا نشود
    if (isAppInstalled() || localStorage.getItem("isAppInstalled") === "true") {
      return;
    }

    // 2. بررسی مدت زمان تاخیر (Snooze) وقتی کاربر ضربدر را زده
    const dismissedTime = localStorage.getItem("installPromptDismissedAt");
    if (dismissedTime) {
      const elapsed = Date.now() - parseInt(dismissedTime);
      if (elapsed < SNOOZE_DURATION) {
        return;
      }
    }

    // 3. هندل کردن رویداد قبل از نصب (Android & Desktop)
    const handlePrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setIsVisible(true), PROMPT_DELAY);
    };

    // 4. هندل کردن رویداد پس از نصب موفق توسط سیستم عامل
    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      localStorage.setItem("isAppInstalled", "true"); // ثبت برای همیشه
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // 5. هندل کردن iOS (چون beforeinstallprompt ندارد)
    if (isIOS()) {
      setTimeout(() => setIsVisible(true), PROMPT_DELAY);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  /**
   * Handle Install Click
   */
  const handleInstall = useCallback(async () => {
    if (isIOS()) {
      setIsVisible(false);
      setShowIOSGuide(true);
    } else if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
          setIsVisible(false);
          setDeferredPrompt(null);
          // ثبت در حافظه که نصب با موفقیت انجام شد تا دیگر باز نشود
          localStorage.setItem("isAppInstalled", "true");
        }
      } catch (err) {
        console.error("Install error:", err);
      }
    }
  }, [deferredPrompt]);

  /**
   * Dismiss (بستن موقت با ضربدر)
   */
  const handleDismiss = useCallback(() => {
    setIsVisible(false);
    setShowIOSGuide(false);
    // ذخیره زمان بستن تا ۷ روز مزاحم کاربر نشویم
    localStorage.setItem("installPromptDismissedAt", Date.now().toString());
  }, []);

  return (
    <>
      {/* Main Install Prompt */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto"
            dir="rtl"
          >
            <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 p-5 overflow-hidden">
              {/* Gradient background */}
              <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full opacity-10 blur-3xl" />

              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={handleDismiss}
                className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors z-10"
                aria-label="بستن"
              >
                <X className="w-4 h-4" />
              </motion.button>

              {/* Content */}
              <div className="flex items-center gap-4 pr-2 relative z-10">
                {/* Icon */}
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg"
                >
                  <Sparkles className="w-7 h-7" />
                </motion.div>

                {/* Text */}
                <div className="flex-1">
                  <h3 className="font-black text-gray-900 text-sm mb-1">
                    اپلیکیشن کی‌داره
                  </h3>
                  <p className="text-[11px] text-gray-600 font-medium leading-relaxed">
                    سریع‌تر، آفلاین و دسترسی سریع‌تر به فروشگاه‌ها.
                  </p>
                </div>
              </div>

              {/* Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleInstall}
                className="mt-4 w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 hover:shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                نصب بر روی صفحه اصلی
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Installation Guide */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            dir="rtl"
            onClick={handleDismiss}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-sm w-full shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6 text-center relative">
                <button
                  onClick={handleDismiss}
                  className="absolute top-4 left-4 text-white/60 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 border-2 border-white/30">
                  <Smartphone className="w-8 h-8" />
                </div>
                <h2 className="font-black text-lg">نصب روی آیفون</h2>
              </div>

              {/* Steps */}
              <div className="p-6 space-y-4">
                <p className="text-center text-sm text-gray-600 font-medium">
                  برای نصب اپلیکیشن، دو مرحله ساده زیر را دنبال کنید:
                </p>

                {/* Step 1 */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">
                      ۱
                    </div>
                    <h3 className="font-black text-gray-900 text-sm">
                      نوار پایین سفاری
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-3 rounded-xl text-xs text-gray-700 font-medium">
                    <Share2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>دکمه Share (اشتراک) را لمس کنید</span>
                  </div>
                </motion.div>

                {/* Step 2 */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-2xl border border-purple-100"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">
                      ۲
                    </div>
                    <h3 className="font-black text-gray-900 text-sm">
                      افزودن به صفحه اصلی
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl text-xs text-gray-700 font-medium">
                      <Plus className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <span>
                        گزینه <span className="font-black">Add to Home Screen</span> را انتخاب کنید
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Animation */}
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="flex justify-center text-indigo-500 pt-2"
                >
                  <ArrowUp className="w-6 h-6 rotate-180" />
                </motion.div>
              </div>

              {/* Footer */}
              <div className="bg-gray-50 border-t p-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDismiss}
                  className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors"
                >
                  فهمیدم ✓
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}