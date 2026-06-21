// src/components/ReferralCard.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Gift,
  Copy,
  Share2,
  CheckCircle2,
  QrCode,
  Download,
  Store,
  Lock,
  Loader2,
  Sparkles,
  AlertCircle,
  Link as LinkIcon,
  TrendingUp,
} from "lucide-react";
import QRCode from "qrcode";

// ============================================================================
// Types
// ============================================================================

interface ReferralCardProps {
  referralCode?: string;
  referralPercentage?: number;
  totalEarnings?: number;
  activeReferrals?: number;
  copied?: boolean;
  onCopy?: () => void;
  onShare?: () => void;
  userRole?: "admin" | "support" | "seller" | "buyer" | "marketer";
  hasStore?: boolean;
  appBaseUrl?: string;
}

interface QRModalProps {
  isOpen: boolean;
  qrDataUrl: string;
  referralCode: string;
  isGenerating: boolean;
  onClose: () => void;
  onDownload: () => void;
}

interface LockedCardProps {
  hasStore: boolean;
}

// ============================================================================
// QR Modal Component
// ============================================================================

const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  qrDataUrl,
  referralCode,
  isGenerating,
  onClose,
  onDownload,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, y: 30, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-gradient-to-br from-white via-slate-50/80 to-blue-50/20 shadow-2xl p-6 border border-white/60 relative overflow-hidden"
            dir="rtl"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-200/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 space-y-5">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 text-center"
              >
                <h3 className="text-lg font-black text-gray-900 flex items-center justify-center gap-2 mb-1">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity }}>
                    <QrCode className="w-6 h-6 text-teal-600" />
                  </motion.div>
                  QR Code کد معرفی
                </h3>
                <p className="text-xs text-gray-500">دوستان خود را برای اسکن دعوت کنید</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-4 border-2 border-dashed border-teal-200 shadow-inner"
              >
                {isGenerating ? (
                  <div className="aspect-square flex items-center justify-center">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
                      <Loader2 className="w-8 h-8 text-teal-600" />
                    </motion.div>
                  </div>
                ) : qrDataUrl ? (
                  <motion.img
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    src={qrDataUrl}
                    alt="QR Code معرفی"
                    className="w-full rounded-xl"
                  />
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100 text-center"
              >
                <p className="text-[10px] text-teal-600 font-bold mb-1">کد معرفی</p>
                <p className="text-sm font-black text-teal-900 tracking-widest select-all">
                  {referralCode}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-3"
              >
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onDownload}
                  disabled={isGenerating || !qrDataUrl}
                  className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-teal-700 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  دانلود
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-gray-100 hover:bg-gray-200 py-3 text-sm font-bold text-gray-700 transition-colors"
                >
                  بستن
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ============================================================================
// Locked Card Component
// ============================================================================

const LockedCard: React.FC<LockedCardProps> = ({ hasStore }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-3xl border border-gray-200/60 bg-gradient-to-br from-gray-50 via-slate-50 to-gray-100/50 backdrop-blur-sm p-5 shadow-sm relative overflow-hidden"
  >
    <div className="absolute -top-16 -left-16 w-32 h-32 bg-gray-200/20 rounded-full blur-2xl pointer-events-none" />

    <div className="relative z-10 flex items-start gap-4">
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 border border-gray-400/30 flex items-center justify-center shadow-md flex-shrink-0"
      >
        <Lock className="w-6 h-6 text-gray-500" />
      </motion.div>

      <div className="flex-1">
        <h3 className="text-sm font-black text-gray-800 mb-2 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-gray-400" />
          کد معرفی
        </h3>
        <p className="text-xs text-gray-600 leading-relaxed mb-2">
          {!hasStore
            ? "🏪 برای استفاده از کد معرفی ابتدا باید یک فروشگاه ایجاد کنید."
            : "✓ فروشگاه شما در حال بررسی است. به زودی دسترسی پیدا خواهید کرد."}
        </p>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 border border-gray-200">
          <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
          <span className="text-[10px] font-bold text-gray-600">منتظر تأیید</span>
        </div>
      </div>
    </div>
  </motion.div>
);

// ============================================================================
// Main Component
// ============================================================================

export default function ReferralCard({
  referralCode = "",
  referralPercentage = 0,
  totalEarnings = 0,
  activeReferrals = 0,
  copied = false,
  onCopy,
  onShare,
  userRole,
  hasStore = false,
  appBaseUrl,
}: ReferralCardProps) {
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const canUseReferral = useMemo(() => userRole === "seller" && hasStore, [userRole, hasStore]);

  const normalizedCode = useMemo(() => referralCode.trim().toUpperCase(), [referralCode]);

  const referralUrl = useMemo(() => {
    const base =
      (appBaseUrl && appBaseUrl.trim()) ||
      (typeof window !== "undefined" ? window.location.origin : "https://kidareh.com");
    return `${base}/signup?ref=${encodeURIComponent(normalizedCode)}`;
  }, [appBaseUrl, normalizedCode]);

  const shareText = useMemo(
    () =>
      `🎉 *کد دعوت من در کی‌داره*\n\n` +
      `📌 کد: \`${normalizedCode}\`\n\n` +
      `💰 با هر خرید، من ${referralPercentage}% پورسانت می‌گیرم!\n\n` +
      `🔗 ${referralUrl}`,
    [normalizedCode, referralPercentage, referralUrl]
  );

  const handleCopy = useCallback(async () => {
    if (!canUseReferral || !normalizedCode) return;

    try {
      await navigator.clipboard.writeText(normalizedCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
      onCopy?.();
    } catch (error) {
      console.error("خطا در کپی:", error);
      onCopy?.();
    }
  }, [canUseReferral, normalizedCode, onCopy]);

  const handleShare = useCallback(async () => {
    if (!canUseReferral || !normalizedCode) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "🎉 کد دعوت کی‌داره",
          text: shareText,
          url: referralUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
      }
      onShare?.();
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        console.error("خطا در اشتراک‌گذاری:", error);
      }
    }
  }, [canUseReferral, normalizedCode, shareText, referralUrl, onShare]);

  const handleGenerateQR = useCallback(async () => {
    if (!canUseReferral || !normalizedCode) return;

    setIsGeneratingQR(true);
    try {
      const dataUrl = await QRCode.toDataURL(referralUrl, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: "M",
        color: {
          dark: "#0D9488",
          light: "#F0FDFA",
        },
      });
      setQrDataUrl(dataUrl);
      setShowQR(true);
    } catch (error) {
      console.error("خطا در ساخت QR Code:", error);
    } finally {
      setIsGeneratingQR(false);
    }
  }, [canUseReferral, normalizedCode, referralUrl]);

  const handleDownloadQR = useCallback(() => {
    if (!qrDataUrl || !normalizedCode) return;

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `kidareh-referral-${normalizedCode}-${new Date().getTime()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl, normalizedCode]);

  if (!canUseReferral) {
    return <LockedCard hasStore={hasStore} />;
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-cyan-50/80 to-white/60 backdrop-blur-xl p-6 shadow-[0_8px_32px_rgba(20,184,166,0.12)] relative overflow-hidden"
      >
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-teal-300/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-300/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5"
          >
            <div className="flex items-start gap-4">
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
                className="w-14 h-14 rounded-2xl bg-white border-2 border-teal-100 shadow-lg flex items-center justify-center flex-shrink-0"
              >
                <Gift className="w-7 h-7 text-teal-600" />
              </motion.div>

              <div className="flex-1">
                <h3 className="text-sm font-black text-teal-950 flex items-center gap-2 mb-1">
                  کد معرفی فروشگاه شما
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <Sparkles className="w-4 h-4 text-amber-500" />
                  </motion.div>
                </h3>
                <p className="text-xs text-teal-700 leading-relaxed">
                  با اشتراک‌گذاری این کد، تا{" "}
                  <span className="font-black bg-teal-100/60 px-2 py-0.5 rounded-md text-teal-700">
                    {referralPercentage}%
                  </span>{" "}
                  کمیسیون از هر خرید دریافت می‌کنید.
                </p>
              </div>

              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/80 border border-teal-200 px-2.5 py-1.5 text-[10px] font-bold text-teal-700 shadow-sm"
              >
                <Store className="w-3.5 h-3.5" />
                فروشگاهی
              </motion.div>
            </div>
          </motion.div>

          {(totalEarnings > 0 || activeReferrals > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 grid grid-cols-2 gap-3"
            >
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl bg-white/70 backdrop-blur-md border border-teal-100 p-4 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-[10px] text-teal-600 font-bold mb-1.5 flex items-center justify-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  درآمد معرفی
                </p>
                <p className="text-base font-black text-teal-900">
                  {totalEarnings.toLocaleString("fa-IR")}
                  <span className="text-[10px] text-teal-500 ml-1">تومان</span>
                </p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="rounded-2xl bg-white/70 backdrop-blur-md border border-teal-100 p-4 text-center shadow-sm hover:shadow-md transition-shadow"
              >
                <p className="text-[10px] text-teal-600 font-bold mb-1.5 flex items-center justify-center gap-1">
                  <Gift className="w-3 h-3" />
                  معرفی فعال
                </p>
                <p className="text-base font-black text-teal-900">
                  {activeReferrals.toLocaleString("fa-IR")}
                  <span className="text-[10px] text-teal-500 ml-1">نفر</span>
                </p>
              </motion.div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-center gap-3"
          >
            <div className="flex-1 rounded-2xl border-2 border-dashed border-teal-300/60 bg-white/60 backdrop-blur-sm px-4 py-3.5 text-center shadow-inner">
              <p className="text-xl font-black tracking-widest text-teal-900 select-all font-mono">
                {normalizedCode || "——"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleCopy}
                disabled={!normalizedCode}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all font-bold shadow-md border-2 ${
                  copied || copyFeedback
                    ? "bg-green-500 text-white border-green-600 shadow-green-300"
                    : "bg-teal-600 text-white border-teal-700 hover:bg-teal-700 shadow-teal-200"
                }`}
              >
                <motion.div
                  key={copied || copyFeedback ? "check" : "copy"}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                >
                  {copied || copyFeedback ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </motion.div>
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={handleShare}
                disabled={!normalizedCode}
                className="w-12 h-12 rounded-xl border-2 border-teal-300 bg-white text-teal-700 flex items-center justify-center hover:bg-teal-50 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
              </motion.button>

              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => navigator.clipboard.writeText(referralUrl)}
                disabled={!normalizedCode}
                className="w-12 h-12 rounded-xl border-2 border-cyan-300 bg-white text-cyan-700 flex items-center justify-center hover:bg-cyan-50 transition-colors shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <LinkIcon className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateQR}
            disabled={!normalizedCode || isGeneratingQR}
            className="w-full rounded-xl bg-white/80 backdrop-blur-md border-2 border-teal-200 py-3.5 text-sm font-bold text-teal-700 hover:bg-teal-50 transition-all shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {isGeneratingQR ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                  <Loader2 className="w-4 h-4" />
                </motion.div>
                در حال ساخت QR...
              </>
            ) : (
              <>
                <QrCode className="w-4 h-4 group-hover:text-teal-600 transition-colors" />
                نمایش QR Code
              </>
            )}
          </motion.button>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 rounded-xl bg-teal-100/40 border border-teal-200/60 text-[11px] text-teal-800 leading-relaxed"
          >
            <span className="font-bold">💡 نکته:</span> دوستان خود را دعوت کنید و از هر خریدشان
            کمیسیون دریافت کنید!
          </motion.div>
        </div>
      </motion.div>

      <QRModal
        isOpen={showQR}
        qrDataUrl={qrDataUrl}
        referralCode={normalizedCode}
        isGenerating={isGeneratingQR}
        onClose={() => setShowQR(false)}
        onDownload={handleDownloadQR}
      />
    </>
  );
}