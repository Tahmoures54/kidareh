import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, Crown, Sparkles, Store, ShoppingCart,
  Receipt, CreditCard, Loader2, AlertCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { BadgeRow, SectionHeader } from "./components";
import { BADGES_LIST } from "../../components/badges";

export default function BuyBadge() {
  const navigate = useNavigate();

  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [paying, setPaying] = useState(false);
  const [isReceiptExpanded, setIsReceiptExpanded] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // مدیریت عنوان صفحه و قفل کردن اسکرول هنگام باز بودن فاکتور
  useEffect(() => { 
    window.scrollTo(0, 0); 
    document.title = "خرید برچسب | کی‌داره"; 
  }, []);

  useEffect(() => {
    document.body.style.overflow = isReceiptExpanded ? "hidden" : "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isReceiptExpanded]);

  const inc = (id: string) => { 
    setQtys(p => ({ ...p, [id]: (p[id] || 0) + 1 })); 
    if(navigator.vibrate) navigator.vibrate(10); 
  };
  
  const dec = (id: string) => { 
    setQtys(p => ({ ...p, [id]: Math.max(0, (p[id] || 0) - 1) })); 
    if(navigator.vibrate) navigator.vibrate(10); 
  };

  const vip = BADGES_LIST.filter(b => b.category === "vip");
  const store = BADGES_LIST.filter(b => b.category === "store");
  const regular = BADGES_LIST.filter(b => b.category === "regular");

  const totalItems = Object.values(qtys).reduce((a, b) => a + b, 0);
  const totalPrice = BADGES_LIST.reduce((sum, b) => sum + (b.price * (qtys[b.id] || 0)), 0);
  const selectedBadges = BADGES_LIST.filter(b => (qtys[b.id] || 0) > 0);

  // روش امن‌تر برای خواندن توکن
  const getAuthToken = () => {
    const match = document.cookie.match(/(^| )token=([^;]+)/);
    if (match) return match[2];
    return localStorage.getItem("token") || "";
  };

  const handleBuy = async () => {
    if (totalItems === 0 || totalPrice <= 0 || paying) return;
    setPaying(true);
    setErrorMsg("");
    
    try {
      localStorage.setItem("pendingPaymentAmount", String(totalPrice));
      const token = getAuthToken();

      const r = await fetch("/api/payment/initiate", {
        method: "POST", 
        headers: { 
          "Content-Type": "application/json", 
          ...(token ? { Authorization: `Bearer ${token}` } : {}) 
        },
        body: JSON.stringify({ 
          description: `خرید ${totalItems} برچسب`, 
          returnUrl: `${window.location.origin}/payment-callback`, 
          items: selectedBadges.map(b => ({ badgeId: b.id, qty: qtys[b.id] })) 
        }),
      });

      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d?.code) {
        localStorage.setItem("pendingTransactionId", String(d.transactionId));
        window.location.href = `https://api.payping.ir/v2/pay/gotoipg/${d.code}`;
      } else throw new Error();
    } catch {
      setErrorMsg("خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید.");
    } finally { 
      setPaying(false); 
    }
  };

  return (
    // افزایش pb-52 به pb-72 برای اینکه زیر کادر صورتحساب مخفی نماند
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 pb-72 text-gray-900 dark:text-white transition-colors" dir="rtl">
      
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-gray-200/60 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button aria-label="بازگشت" onClick={() => navigate(-1)} className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center active:scale-90 transition-transform">
            <ArrowRight className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">ارتقای فروشگاه <Crown className="w-5 h-5 text-amber-500 drop-shadow-sm" /></h1>
            <p className="text-[10px] text-gray-500 font-medium mt-0.5">افزایش بازدید کالاها تا ۵ برابر</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 space-y-8 max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="relative bg-gradient-to-br from-gray-900 to-black rounded-[2rem] p-6 overflow-hidden shadow-2xl shadow-gray-900/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
          <div className="relative z-10 flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white mb-1">دیده شدن بیشتر = فروش بیشتر</h2>
              <p className="text-[11px] text-gray-300 font-medium leading-relaxed">با برچسب‌های ویژه، کالای شما در صدر جستجوها قرار می‌گیرد.</p>
            </div>
          </div>
        </motion.div>

        <div className="space-y-8">
          {vip.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <SectionHeader icon={Crown} title="رویدادها و مناسبت‌ها" badge="⚡ داغ‌ترین‌ها" badgeColor="bg-rose-100 text-rose-600" />
              <div className="space-y-3 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
                {vip.map(b => <BadgeRow key={b.id} badge={b} quantity={qtys[b.id] || 0} price={b.price} onInc={() => inc(b.id)} onDec={() => dec(b.id)} variant="vip" />)}
              </div>
            </motion.div>
          )}

          {store.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <SectionHeader icon={Store} title="اعتبار فروشگاه" badge="✨ ویژه" badgeColor="bg-blue-100 text-blue-700" />
              <div className="space-y-3 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
                {store.map(b => <BadgeRow key={b.id} badge={b} quantity={qtys[b.id] || 0} price={b.price} onInc={() => inc(b.id)} onDec={() => dec(b.id)} variant="store" />)}
              </div>
            </motion.div>
          )}

          {regular.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <SectionHeader icon={ShoppingCart} title="برچسب‌های روزمره" badge="پرفروش" badgeColor="bg-gray-200 text-gray-700" />
              <div className="space-y-3 bg-white p-2 rounded-3xl border border-gray-100 shadow-sm">
                {regular.map(b => <BadgeRow key={b.id} badge={b} quantity={qtys[b.id] || 0} price={b.price} onInc={() => inc(b.id)} onDec={() => dec(b.id)} variant="regular" />)}
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <AnimatePresence>
        {totalItems > 0 && (
          <>
            {/* ارتقای z-index به z-[80] برای پوشش کامل */}
            {isReceiptExpanded && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsReceiptExpanded(false)} className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[80]" />}
            
            {/* ارتقای z-index به z-[90] */}
            <motion.div layout initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 200 }} className="fixed bottom-0 inset-x-0 z-[90] flex justify-center pointer-events-none">
              
              {/* اضافه کردن pb-[calc(env(safe-area-inset-bottom)+5.5rem)] برای هل دادن محتوا به بالای منوی ناوبری 
                  pointer-events-auto برای اینکه فقط خود کادر قابل کلیک باشد نه فضای خالی اطرافش */}
              <div className="w-full max-w-lg bg-white/95 backdrop-blur-xl border-t border-gray-200 shadow-[0_-20px_40px_rgba(0,0,0,0.05)] rounded-t-[2.5rem] px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] pointer-events-auto">
                
                <button aria-label="نمایش فاکتور" onClick={() => setIsReceiptExpanded(!isReceiptExpanded)} className="w-full flex flex-col items-center justify-center py-3">
                  <div className="w-12 h-1.5 bg-gray-200 rounded-full mb-2" />
                  {!isReceiptExpanded && <span className="text-[10px] font-bold text-gray-400">مشاهده فاکتور</span>}
                </button>

                <AnimatePresence>
                  {isReceiptExpanded && (
                    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
                      <div className="bg-gray-50 rounded-3xl p-4 mb-4 border border-gray-100">
                        <p className="text-xs font-black mb-3 flex items-center gap-2"><Receipt className="w-4 h-4 text-indigo-500" /> فاکتور خرید</p>
                        <dl className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
                          {selectedBadges.map(b => (
                            <div key={b.id} className="flex justify-between items-center text-xs">
                              <dt className="flex items-center gap-2 font-bold text-gray-700">
                                <span className="w-6 h-6 bg-white text-indigo-600 font-black rounded-lg flex items-center justify-center shadow-sm border border-gray-100">{qtys[b.id]}</span>
                                {b.name}
                              </dt>
                              <dd className="font-black">{(b.price * qtys[b.id]).toLocaleString("fa-IR")} <span className="text-[9px] text-gray-400 font-bold">تومان</span></dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {errorMsg && (
                  <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2 border border-red-100">
                    <AlertCircle className="w-4 h-4" />
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-gray-500 mb-0.5">مبلغ نهایی پرداخت</p>
                    <div className="text-xl font-black text-indigo-600 tracking-tight flex items-baseline gap-1">
                      {totalPrice.toLocaleString("fa-IR")} <span className="text-[10px] font-bold">تومان</span>
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={handleBuy} disabled={paying} className="w-full sm:flex-[1.5] h-14 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/30">
                    {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <><CreditCard className="w-5 h-5" /> پرداخت و فعالسازی</>}
                  </motion.button>
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}