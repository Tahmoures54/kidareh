import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowRight,
  Tag,
  Sparkles,
  Zap,
  Plus,
  Minus,
  ShoppingCart,
  Receipt,
  Gift,
  ShoppingBag,
  Flame,
  CreditCard,
  ChevronLeft,
  Crown,
  BadgeCheck,
  Loader2,
  Heart,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getBadgeStyle } from "../utils";
import { useSettings } from "../context/SettingsContext";

type BadgeItem = {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  desc: string;
  category: "vip" | "regular";
};

export default function BuyBadge() {
  const navigate = useNavigate();
  const { badgeConfigs } = useSettings();

  const badges = useMemo<BadgeItem[]>(
    () => [
      {
        id: "بلک فرایدی",
        name: "بلک فرایدی",
        icon: Flame,
        color: "bg-gray-900 text-white",
        desc: "پرطرفدارترین! فروش خود را در روزهای خاص چندبرابر کنید.",
        category: "vip",
      },
      {
        id: "جشنواره نوروزی",
        name: "جشنواره نوروزی",
        icon: Sparkles,
        color: "bg-emerald-500 text-white",
        desc: "بزرگترین رویداد فروش سال ویژه عید نوروز.",
        category: "vip",
      },
      {
        id: "جشنواره بهاری",
        name: "جشنواره بهاری",
        icon: Gift,
        color: "bg-pink-500 text-white",
        desc: "ویژه فروش‌های نوروزی و فصل بهار با بازدید بالا.",
        category: "vip",
      },
      {
        id: "جشنواره یلدا",
        name: "جشنواره شب یلدا",
        icon: ShoppingBag,
        color: "bg-red-600 text-white",
        desc: "فروش شگفت‌انگیز برای شب یلدا و تخفیف‌های ویژه.",
        category: "vip",
      },
      {
        id: "پیشنهاد ویژه",
        name: "پیشنهاد ویژه",
        icon: Sparkles,
        color: "bg-fuchsia-500 text-white",
        desc: "جلب توجه خریداران برای بهترین کالاها.",
        category: "regular",
      },
      {
        id: "پرفروش‌ترین",
        name: "پرفروش‌ترین",
        icon: TrendingUp,
        color: "bg-amber-400 text-amber-950",
        desc: "نشان دادن اعتبار و محبوبیت کالای شما.",
        category: "regular",
      },
      {
        id: "حراج آخر فصل",
        name: "حراج آخر فصل",
        icon: Tag,
        color: "bg-orange-500 text-white",
        desc: "ایده‌آل برای پاکسازی انبار در انتهای فصل.",
        category: "regular",
      },
      {
        id: "تخفیف دانشجویی",
        name: "تخفیف دانشجویی",
        icon: Receipt,
        color: "bg-indigo-500 text-white",
        desc: "جذب قشر دانشجو با تخفیف‌های خاص.",
        category: "regular",
      },
      {
        id: "تخفیف ویژه",
        name: "تخفیف ویژه",
        icon: Tag,
        color: "bg-rose-500 text-white",
        desc: "مناسب برای کالاهایی که تخفیف واقعی دارند.",
        category: "regular",
      },
      {
        id: "فروش ویژه",
        name: "فروش ویژه",
        icon: Sparkles,
        color: "bg-amber-500 text-white",
        desc: "جلب توجه خریداران با نوار طلایی رنگ.",
        category: "regular",
      },
      {
        id: "حراج",
        name: "حراج",
        icon: Zap,
        color: "bg-purple-500 text-white",
        desc: "برای فروش سریع کالاهای تک سایز یا آخر بار.",
        category: "regular",
      },
      {
        id: "خرید عمده",
        name: "خرید عمده",
        icon: ShoppingCart,
        color: "bg-slate-700 text-white",
        desc: "نمایش امکان فروش عمده با قیمت کمتر.",
        category: "regular",
      },
      {
        id: "جدید",
        name: "جدید",
        icon: Sparkles,
        color: "bg-cyan-500 text-white",
        desc: "معرفی کالاهای تازه وارد شده به صورت چشمگیر.",
        category: "regular",
      },
      {
        id: "موجود شد",
        name: "موجود شد",
        icon: Zap,
        color: "bg-teal-500 text-white",
        desc: "اطلاع رسانی سریع برای کالاهای پرمخاطب.",
        category: "regular",
      },
    ],
    []
  );

  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const initialState: Record<string, number> = {};
    badges.forEach((b) => {
      initialState[b.id] = 0;
    });
    return initialState;
  });

  const [isProcessing, setIsProcessing] = useState(false);

  const handleIncrement = (id: string) =>
    setQuantities((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));

  const handleDecrement = (id: string) =>
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, (prev[id] || 0) - 1) }));

  const totalItems = Object.values(quantities).reduce((a, b) => a + b, 0);

  const totalPrice = badges.reduce((total, badge) => {
    const price = Number(badgeConfigs?.[badge.id]?.price || 0);
    return total + price * (quantities[badge.id] || 0);
  }, 0);

  const handleBuy = async () => {
    if (totalItems === 0 || totalPrice <= 0 || isProcessing) return;

    setIsProcessing(true);
    try {
      localStorage.setItem("pendingPaymentAmount", String(totalPrice));

      const tokenFromCookie =
        document.cookie
          .split("; ")
          .find((row) => row.startsWith("token="))
          ?.split("=")[1] || "";

      const token = tokenFromCookie || localStorage.getItem("token") || "";

      const response = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          amount: totalPrice,
          description: `خرید ${totalItems} عدد برچسب تبلیغاتی کی‌داره`,
          returnUrl: `${window.location.origin}/payment-callback`,
          items: badges
            .filter((b) => (quantities[b.id] || 0) > 0)
            .map((b) => ({
              badgeId: b.id,
              qty: quantities[b.id],
              unitPrice: Number(badgeConfigs?.[b.id]?.price || 0),
            })),
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(errText || "خطا در ارتباط با درگاه");
      }

      const data = (await response.json()) as { code?: string; transactionId?: string | number };

      if (data?.code && data?.transactionId) {
        localStorage.setItem("pendingTransactionId", String(data.transactionId));
        window.location.href = `https://api.payping.ir/v2/pay/gotoipg/${data.code}`;
        return;
      }

      throw new Error("کد پرداخت یا شناسه تراکنش نامعتبر است");
    } catch (error) {
      console.error(error);
      alert("خطا در انتقال به درگاه پرداخت. لطفاً اتصال اینترنت خود را بررسی کنید.");
      setIsProcessing(false);
    }
  };

  const vipBadges = badges.filter((b) => b.category === "vip");
  const regularBadges = badges.filter((b) => b.category === "regular");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col h-full bg-gradient-to-br from-gray-50 via-white to-teal-50/30 pb-40 relative overflow-hidden"
      dir="rtl"
    >
      {/* نورهای تزئینی */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-200/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-cyan-200/10 rounded-full blur-3xl" />
      </div>

      {/* هدر */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white/80 backdrop-blur-xl px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-4 shadow-sm sticky top-0 z-30 rounded-b-3xl border-b border-gray-100"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors border border-gray-100 shrink-0"
            title="بازگشت"
          >
            <ArrowRight className="w-5 h-5" />
          </motion.button>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <Crown className="w-5 h-5 text-amber-500" />
              </motion.div>
              خرید برچسب تبلیغاتی
            </h1>
            <p className="text-[10px] text-gray-500 font-bold mt-1 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
              افزایش بازدید و فروش کالاهایتان
            </p>
          </div>
        </div>
      </motion.header>

      <div className="px-4 space-y-6 relative z-10 pt-6">
        {/* بنر اطلاعات */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-3xl p-5 border-2 border-teal-200/50 shadow-sm relative overflow-hidden"
        >
          <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-teal-200 rounded-full blur-2xl opacity-40" />
          <div className="flex items-start gap-4 relative z-10">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-md border border-teal-100"
            >
              <Sparkles className="w-6 h-6 text-teal-600" />
            </motion.div>
            <div>
              <h3 className="text-sm font-black text-teal-900 mb-1.5">
                📈 دیده شدن بیشتر = فروش بیشتر
              </h3>
              <p className="text-xs text-teal-800/80 leading-relaxed font-medium">
                آگهی‌های دارای برچسب تا <span className="font-black text-teal-600">۵ برابر بیشتر</span> بازدید دریافت می‌کنند. برچسب‌ها برای همیشه در کیف پول شما باقی می‌ماند.
              </p>
            </div>
          </div>
        </motion.div>

        {/* بخش VIP */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-black text-gray-900 flex items-center gap-2.5">
              <motion.div
                animate={{ rotate: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Crown className="w-5 h-5 text-rose-500" />
              </motion.div>
              پکیج‌های ویژه و فصلی
            </h2>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200">
              ⚡ پرطلب
            </span>
          </div>

          <div className="space-y-3.5">
            {vipBadges.map((badge, index) => {
              const quantity = quantities[badge.id] || 0;
              const price = Number(badgeConfigs?.[badge.id]?.price || 0);
              const isSelected = quantity > 0;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + index * 0.08 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white rounded-2xl p-4 border-2 transition-all duration-300 relative overflow-hidden cursor-pointer ${
                    isSelected
                      ? "border-rose-400 shadow-lg shadow-rose-500/20 bg-gradient-to-br from-white to-rose-50/20"
                      : "border-rose-100 shadow-sm hover:border-rose-200 hover:shadow-md"
                  }`}
                >
                  <div className="absolute top-0 right-0 w-1.5 h-full bg-gradient-to-b from-rose-500 to-orange-500" />

                  {isSelected && (
                    <motion.div
                      layoutId="selected-glow"
                      className="absolute -left-8 -top-8 w-32 h-32 bg-rose-100 rounded-full blur-3xl opacity-40"
                    />
                  )}

                  <div className="flex items-start gap-4 relative z-10">
                    {/* آیکون */}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: -5 }}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-md transform ${badge.color} border border-white/30`}
                    >
                      <badge.icon className="w-7 h-7" />
                    </motion.div>

                    {/* محتوا */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-black text-gray-900 text-base">{badge.name}</h3>
                        <div className="flex items-center gap-1.5">
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <BadgeCheck className="w-5 h-5 text-rose-500" />
                            </motion.div>
                          )}
                          <span className={`text-[9px] px-2.5 py-1 rounded-lg font-black shadow-sm ${getBadgeStyle(badge.id)}`}>
                            نمونه
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-gray-600 mb-3.5 bg-white/50 p-2.5 rounded-xl border border-rose-100/50 leading-relaxed font-medium">
                        {badge.desc}
                      </p>

                      {/* قیمت و دکمه‌ها */}
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-gray-400 font-bold mb-0.5">هر عدد:</span>
                          <span className="text-base font-black text-rose-600">
                            {price.toLocaleString("fa-IR")}{" "}
                            <span className="text-[9px] font-bold text-gray-400">تومان</span>
                          </span>
                        </div>

                        <motion.div
                          className="flex items-center gap-1.5 bg-gray-50 rounded-xl p-1.5 border-2 border-gray-200 shadow-sm"
                        >
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handleIncrement(badge.id)}
                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-teal-600 shadow-sm border border-gray-100 hover:bg-teal-50 transition-colors font-bold"
                          >
                            <Plus className="w-4 h-4" />
                          </motion.button>
                          <span className="w-8 text-center font-black text-gray-900 text-sm">
                            {quantity.toLocaleString("fa-IR")}
                          </span>
                          <motion.button
                            whileHover={{ scale: quantity > 0 ? 1.1 : 1 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={() => handleDecrement(badge.id)}
                            disabled={quantity === 0}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all font-bold ${
                              quantity > 0
                                ? "bg-white text-red-500 shadow-sm border border-gray-100 hover:bg-red-50"
                                : "text-gray-300 cursor-not-allowed"
                            }`}
                          >
                            <Minus className="w-4 h-4" />
                          </motion.button>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* بخش معمولی */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3.5 pt-6 border-t-2 border-dashed border-gray-200"
        >
          <h2 className="text-sm font-black text-gray-900 mb-3 flex items-center gap-2.5 px-1">
            <ShoppingCart className="w-4.5 h-4.5 text-teal-600" />
            برچسب‌های روزمره
          </h2>

          <div className="space-y-2.5">
            {regularBadges.map((badge, index) => {
              const quantity = quantities[badge.id] || 0;
              const price = Number(badgeConfigs?.[badge.id]?.price || 0);
              const isSelected = quantity > 0;

              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.04 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white rounded-xl p-3 border-2 transition-all ${
                    isSelected
                      ? "border-teal-400 shadow-md bg-teal-50/10"
                      : "border-gray-100 shadow-sm hover:border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* آیکون کوچک */}
                    <motion.div
                      whileHover={{ scale: 1.08 }}
                      className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${badge.color} text-lg`}
                    >
                      <badge.icon className="w-5 h-5" />
                    </motion.div>

                    {/* محتوا کوچک */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-bold text-gray-900 text-sm">{badge.name}</h3>
                        <span className={`text-[8px] px-2 py-0.5 rounded-md font-bold ${getBadgeStyle(badge.id)}`}>
                          نمونه
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 line-clamp-1 font-medium">
                        {badge.desc}
                      </p>
                    </div>

                    {/* قیمت و دکمه‌ها */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-sm font-black text-teal-600 whitespace-nowrap">
                        {price.toLocaleString("fa-IR")}{" "}
                        <span className="text-[8px] text-gray-400">ت</span>
                      </span>

                      <motion.div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5 border border-gray-200">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => handleIncrement(badge.id)}
                          className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-teal-600 shadow-sm border border-gray-100 text-sm font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </motion.button>
                        <span className="w-6 text-center font-bold text-gray-900 text-xs">
                          {quantity.toLocaleString("fa-IR")}
                        </span>
                        <motion.button
                          whileHover={{ scale: quantity > 0 ? 1.1 : 1 }}
                          whileTap={{ scale: 0.9 }}
                          type="button"
                          onClick={() => handleDecrement(badge.id)}
                          disabled={quantity === 0}
                          className={`w-7 h-7 rounded-md flex items-center justify-center transition-all text-sm font-bold ${
                            quantity > 0
                              ? "bg-white text-red-500 shadow-sm border border-gray-100"
                              : "text-gray-300 cursor-not-allowed"
                          }`}
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </motion.button>
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* فوتر شناور */}
      <AnimatePresence>
        {totalItems > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", stiffness: 150, damping: 25 }}
            className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-white/95 backdrop-blur-xl rounded-t-3xl shadow-2xl shadow-gray-900/20 border-t border-gray-200 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            {/* Handler */}
            <motion.div
              animate={{ scaleX: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-12 h-1.5 bg-gradient-to-r from-gray-200 via-gray-400 to-gray-200 rounded-full mx-auto mt-3 mb-3"
            />

            <div className="px-5 space-y-4">
              {/* عنوان */}
              <div>
                <h3 className="font-black text-gray-900 text-sm mb-1 flex items-center gap-2">
                  <Receipt className="w-4.5 h-4.5 text-teal-600" />
                  خلاصه سفارش
                </h3>
                <p className="text-[10px] text-gray-500 font-medium">
                  {totalItems} برچسب • کل {totalPrice.toLocaleString("fa-IR")} تومان
                </p>
              </div>

              {/* لیست محصولات */}
              <div className="max-h-40 overflow-y-auto space-y-2.5 pr-2">
                {badges.map((badge) => {
                  if ((quantities[badge.id] || 0) === 0) return null;
                  const price = Number(badgeConfigs?.[badge.id]?.price || 0);
                  const itemTotal = price * (quantities[badge.id] || 0);

                  return (
                    <motion.div
                      key={`invoice-${badge.id}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100"
                    >
                      <span className="text-gray-700 flex items-center gap-2 font-medium">
                        <span className="w-5 h-5 rounded-md bg-teal-100 flex items-center justify-center text-[9px] font-black text-teal-700 border border-teal-200">
                          {(quantities[badge.id] || 0).toLocaleString("fa-IR")}
                        </span>
                        <span className="truncate max-w-[150px]">{badge.name}</span>
                      </span>
                      <span className="font-black text-gray-900 whitespace-nowrap text-right">
                        {itemTotal.toLocaleString("fa-IR")}
                        <span className="text-[8px] text-gray-400 mr-1">ت</span>
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              {/* خط جدا‌کننده */}
              <div className="border-t-2 border-dashed border-gray-200 pt-3 pb-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-gray-900 text-sm">مبلغ پرداخت:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-teal-600">
                      {totalPrice.toLocaleString("fa-IR")}
                    </span>
                    <span className="text-[10px] text-gray-400 mr-1 font-bold">تومان</span>
                  </div>
                </div>
              </div>

              {/* دکمه پرداخت */}
              <motion.button
                whileHover={{ scale: 1.01, y: -2 }}
                whileTap={{ scale: 0.99 }}
                type="button"
                onClick={handleBuy}
                disabled={isProcessing || totalPrice <= 0}
                className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 text-white shadow-xl shadow-teal-500/30 hover:shadow-2xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mb-2"
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>درحال اتصال...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    <span>پرداخت و فعال‌سازی</span>
                    <motion.div animate={{ x: [0, 5, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
                      <ChevronLeft className="w-4 h-4" />
                    </motion.div>
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty State */}
      {totalItems === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 flex items-center justify-center h-32 pb-6 pointer-events-none"
        >
          <div className="text-center">
            <p className="text-sm text-gray-400 font-bold">برچسبی انتخاب نشده</p>
            <p className="text-[10px] text-gray-300 mt-1">برای شروع، برچسبی را انتخاب کنید</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}