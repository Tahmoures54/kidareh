import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown,
  CreditCard,
  Loader2,
  AlertCircle,
  Check,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BADGES_LIST, CATEGORY_LABELS, type BadgeType } from "../../components/badges";
import { PageHeader } from "../../components/ui/PageHeader";
import { HintCard } from "../../components/ui/HintCard";

export default function BuyBadge() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "افزایش دیده شدن | کی‌داره";
  }, []);

  const selected = BADGES_LIST.find((b) => b.id === selectedId) || null;

  const handleBuy = async () => {
    if (!selected || paying) return;
    setPaying(true);
    setErrorMsg("");
    try {
      localStorage.setItem("pendingPaymentAmount", String(selected.price));
      const r = await fetch("/api/payment/initiate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: selected.name,
          returnUrl: `${window.location.origin}/payment-callback`,
          items: [{ badgeId: selected.id, qty: 1 }],
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "خطا");

      if (d.devMode && d.transactionId) {
        await fetch("/api/payment/dev-confirm", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId: d.transactionId }),
        });
        navigate("/seller");
        return;
      }

      if (d?.code) {
        localStorage.setItem("pendingTransactionId", String(d.transactionId));
        window.location.href = `https://api.payping.ir/v2/pay/gotoipg/${d.code}`;
      } else throw new Error();
    } catch (e: any) {
      setErrorMsg(e?.message || "اتصال به پرداخت برقرار نشد. دوباره تلاش کنید.");
    } finally {
      setPaying(false);
    }
  };

  const groups: BadgeType["category"][] = ["trial", "boost", "banner", "trust"];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-gray-950 pb-36 text-gray-900 dark:text-white" dir="rtl">
      <PageHeader title="بیشتر دیده شوید" subtitle="ساده و شفاف — یک پکیج انتخاب کنید" />

      <main className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        <HintCard title="چطور کار می‌کند؟" tone="blue">
          یک گزینه را لمس کنید، بعد دکمهٔ پایین را بزنید. نیازی به تنظیمات پیچیده نیست.
          اثر را در آمار فروشگاه‌تان می‌بینید.
        </HintCard>

        {groups.map((cat) => {
          const items = BADGES_LIST.filter((b) => b.category === cat);
          if (!items.length) return null;
          return (
            <section key={cat} className="space-y-3">
              <h2 className="text-xs font-black text-gray-500 px-1">{CATEGORY_LABELS[cat]}</h2>
              <div className="space-y-3">
                {items.map((b) => {
                  const active = selectedId === b.id;
                  const Icon = b.icon;
                  return (
                    <motion.button
                      key={b.id}
                      type="button"
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedId(b.id)}
                      className={`w-full text-right rounded-3xl border p-4 transition-all ${
                        active
                          ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 shadow-md shadow-indigo-500/10"
                          : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm"
                      }`}
                    >
                      <div className="flex gap-3 items-start">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${b.gradient} flex items-center justify-center shrink-0 shadow`}
                        >
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm">{b.name}</span>
                            {b.recommended && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                پیشنهاد ما
                              </span>
                            )}
                          </div>
                          <p className="text-[12px] text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                            {b.simpleDesc}
                          </p>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-300 font-bold mt-1">
                            {b.benefit}
                          </p>
                          <p className="text-sm font-black mt-2 text-gray-900 dark:text-white">
                            {b.price.toLocaleString("fa-IR")}{" "}
                            <span className="text-[10px] font-bold text-gray-400">تومان</span>
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 ${
                            active ? "border-indigo-600 bg-indigo-600" : "border-gray-300"
                          }`}
                        >
                          {active && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </section>
          );
        })}

        <p className="text-center text-[11px] text-gray-400 pb-4">
          بعد از پرداخت، اثر بلافاصله فعال می‌شود.
        </p>
      </main>

      {/* نوار پایین ساده */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="max-w-lg mx-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-auto">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-3xl p-4 shadow-2xl">
            {errorMsg && (
              <div className="mb-3 flex items-center gap-2 text-rose-600 text-xs font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {errorMsg}
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                {selected ? (
                  <>
                    <p className="text-[10px] text-gray-500 font-bold">مبلغ پرداخت</p>
                    <p className="text-lg font-black text-indigo-600 truncate">
                      {selected.price.toLocaleString("fa-IR")} تومان
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-bold text-gray-500">اول یک پکیج را انتخاب کنید</p>
                )}
              </div>
              <button
                type="button"
                disabled={!selected || paying}
                onClick={handleBuy}
                className="h-14 px-6 rounded-2xl bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-indigo-500/30 disabled:opacity-40 active:scale-95 transition-transform"
              >
                {paying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    پرداخت
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
