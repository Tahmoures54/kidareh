import React, { useState, useEffect } from "react";
import { Download, X, Smartphone, Share, PlusSquare, ArrowUp, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// تعریف تایپ رویداد PWA
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // 1. بررسی اینکه آیا کاربر قبلاً اپلیکیشن را نصب کرده است؟
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    
    if (isInstalled) return;

    // 2. بررسی سیستم خاموشی موقت (Snooze) - مثلاً ۷ روز
    const dismissedAt = localStorage.getItem('installPromptDismissedAt');
    if (dismissedAt) {
      const daysPassed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysPassed < 7) return; // اگر کمتر از 7 روز گذشته، پیام را نشان نده
    }

    // 3. تشخیص اینکه آیا دستگاه اپل (iOS) است؟
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isAppleDevice);

    // 4. هندل کردن رویداد نصب در اندروید و ویندوز (Chrome/Edge)
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // تاخیر 5 ثانیه‌ای تا کاربر ابتدا محتوای سایت را ببیند سپس پیام نصب بیاید
      setTimeout(() => setIsVisible(true), 5000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // اگر iOS بود، چون این رویداد را ساپورت نمی‌کند، خودمان پیام را نشان می‌دهیم
    if (isAppleDevice) {
      setTimeout(() => setIsVisible(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      // برای iOS راهنمای تصویری را باز می‌کنیم
      setIsVisible(false);
      setShowIosInstructions(true);
    } else if (deferredPrompt) {
      // برای اندروید فرآیند استاندارد PWA را اجرا می‌کنیم
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsVisible(false);
        setDeferredPrompt(null);
      }
    }
  };

  const dismiss = () => {
    setIsVisible(false);
    setShowIosInstructions(false);
    // ذخیره زمان فعلی برای اینکه تا 7 روز دیگر مزاحم کاربر نشویم
    localStorage.setItem('installPromptDismissedAt', Date.now().toString());
  };

  return (
    <>
      {/* ----------------------------------------------------- */}
      {/* 1. پاپ‌آپ اصلی نصب (نمایش در پایین صفحه - Bottom Sheet) */}
      {/* ----------------------------------------------------- */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-50 max-w-md mx-auto"
            dir="rtl"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border border-white/50 p-4 relative overflow-hidden">
              {/* پس‌زمینه تزئینی */}
              <div className="absolute -top-10 -right-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
              
              <button onClick={dismiss} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 active:scale-95 bg-gray-50 p-1.5 rounded-full transition-colors z-10">
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-200">
                  <Sparkles className="w-7 h-7" />
                </div>
                <div className="flex-1 pr-1">
                  <h3 className="font-black text-gray-900 text-sm mb-0.5">اپلیکیشن کی‌داره</h3>
                  <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-3">
                    تجربه‌ای سریع‌تر، بدون نیاز به اینترنت و دسترسی آنی به فروشگاه‌ها.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleInstallClick}
                      className="flex-1 bg-gray-900 text-white py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 hover:bg-black active:scale-95 transition-all shadow-xl shadow-gray-900/20"
                    >
                      <Download className="w-4 h-4" /> نصب مستقیم اپلیکیشن
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------------------------------------------- */}
      {/* 2. راهنمای تصویری مخصوص کاربران آیفون (iOS Instructions) */}
      {/* ----------------------------------------------------- */}
      <AnimatePresence>
        {showIosInstructions && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-end px-4 pb-8"
            dir="rtl"
            onClick={dismiss} // بستن با کلیک روی پس‌زمینه
          >
            <motion.div 
              initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()} // جلوگیری از بسته شدن هنگام کلیک روی خود کارت
              className="bg-white rounded-[2rem] w-full max-w-sm p-6 shadow-2xl relative"
            >
              <button onClick={dismiss} className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full">
                <X className="w-5 h-5" />
              </button>

              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-sm -mt-12">
                <Smartphone className="w-8 h-8" />
              </div>

              <h3 className="font-black text-center text-gray-900 text-base mb-2">نصب روی آیفون (iOS)</h3>
              <p className="text-xs text-center text-gray-500 font-medium mb-6 leading-relaxed">
                برای نصب اپلیکیشن کی‌داره در سیستم‌عامل iOS، کافیست دو مرحله ساده زیر را انجام دهید:
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <Share className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-0.5">مرحله اول</span>
                    <span className="text-xs font-black text-gray-900">در نوار پایین مرورگر سفاری، دکمه <span className="text-blue-600">Share</span> را لمس کنید.</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                    <PlusSquare className="w-5 h-5 text-gray-800" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 block mb-0.5">مرحله دوم</span>
                    <span className="text-xs font-black text-gray-900">در منوی باز شده، گزینه <span className="font-bold border border-gray-200 px-1.5 py-0.5 rounded bg-white">Add to Home Screen</span> را انتخاب کنید.</span>
                  </div>
                </div>
              </div>

              {/* انیمیشن فلش رو به پایین برای راهنمایی بصری محل دکمه شیر در سفاری */}
              <motion.div 
                animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}
                className="mt-8 flex justify-center text-blue-500"
              >
                <ArrowUp className="w-8 h-8 rotate-180" />
              </motion.div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}