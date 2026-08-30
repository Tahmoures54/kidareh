import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import {
  ArrowRight,
  UploadCloud,
  X,
  Package,
  CheckCircle2,
  Camera,
  Plus,
  Sparkles,
  AlignRight,
  Loader2,
  TrendingUp,
  Check,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { BADGES_LIST } from "../../components/badges";
import { fmtPrice } from "./utils";
import { useAddProduct } from "./components/hooks";
import { Toast } from "../../components/ui/Toast";
import SegmentedControl from "./components/SegmentedControl";

export default function AddProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refs, state, setters, actions } = useAddProduct(user);

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "ثبت کالا | کی‌داره";
  }, []);

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const totalBadgesAvailable = Object.values(state.inventory).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] pb-28 text-slate-900 dark:text-white font-sans" dir="rtl">
      <AnimatePresence>{state.toast && <Toast key={state.toast.id} msg={state.toast.msg} type={state.toast.type} />}</AnimatePresence>

      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center" aria-label="برگشت">
            <ArrowRight className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-black">ثبت کالای جدید</h1>
            <p className="text-[11px] text-slate-400 font-medium">فقط اسم، قیمت و عکس کافیه</p>
          </div>
        </div>
      </header>

      <form onSubmit={actions.handleSubmit} className="px-5 py-6 space-y-6 max-w-lg mx-auto">
        <div>
          <label className="text-xs font-bold text-slate-500 mb-2 block">عکس کالا (اختیاری ولی بهتره باشه)</label>
          <input type="file" accept="image/*" ref={refs.fileRef} onChange={actions.handleImage} className="hidden" />
          <input type="file" accept="image/*" capture="environment" ref={refs.cameraRef} onChange={actions.handleImage} className="hidden" />

          <AnimatePresence mode="wait">
            {state.compressing ? (
              <div className="h-48 bg-indigo-50 dark:bg-indigo-500/10 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-indigo-200">
                <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                <span className="text-xs text-indigo-600 font-bold">داره عکس رو آماده می‌کنه…</span>
              </div>
            ) : state.preview ? (
              <div className="relative h-56 rounded-2xl overflow-hidden group">
                <img src={state.preview} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                <button type="button" onClick={actions.removeImage} className="absolute top-3 right-3 w-9 h-9 bg-black/50 text-white rounded-xl flex items-center justify-center" aria-label="حذف عکس">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => refs.fileRef.current?.click()} className="h-28 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                  <span className="text-xs font-bold">از گالری</span>
                </button>
                <button type="button" onClick={() => refs.cameraRef.current?.click()} className="h-28 flex flex-col items-center justify-center gap-2 bg-white dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors">
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-bold">با دوربین</span>
                </button>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-500 mb-1.5 block">
            اسم کالا <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Package className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={state.name}
              onChange={(e) => setters.setName(e.target.value)}
              placeholder="مثلاً: گوشی سامسونگ A15"
              className="w-full h-12 pr-10 pl-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">قیمت (تومان)</label>
            <input
              type="text"
              inputMode="numeric"
              value={state.price}
              onChange={(e) => setters.setPrice(fmtPrice(e.target.value))}
              placeholder="مثلاً ۱۲۰۰۰۰۰"
              dir="ltr"
              className="w-full h-12 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-left outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 mb-1.5 block">وضعیت</label>
            <div className="h-12">
              <SegmentedControl
                options={["موجود", "ناموجود"]}
                value={state.status === "موجود" || state.status === "ناموجود" ? state.status : "موجود"}
                onChange={(v) => setters.setStatus(v as "موجود" | "ناموجود")}
              />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <AlignRight className="w-3.5 h-3.5" /> توضیحات (اختیاری)
            </label>
            <button
              type="button"
              onClick={actions.generateDesc}
              disabled={state.genDesc || !state.name}
              className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg disabled:opacity-40"
            >
              {state.genDesc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
              پیشنهاد متن
            </button>
          </div>
          <textarea
            value={state.desc}
            onChange={(e) => setters.setDesc(e.target.value)}
            placeholder="مثلاً: نو، با گارانتی، تحویل حضوری در مغازه"
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:border-indigo-500 resize-none transition-colors leading-7"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> برچسب دیده شدن (اختیاری)
            </label>
            {state.loadingInventory ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <span className="text-[10px] font-bold text-slate-400">{totalBadgesAvailable} تا داری</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => navigate("/buy-badge")}
              className="h-20 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span className="text-[10px] font-bold">خرید برچسب</span>
            </button>

            {BADGES_LIST.map((badgeConfig) => {
              const count = state.inventory[badgeConfig.id] || 0;
              const disabled = count <= 0;
              const Icon = badgeConfig.icon;
              const active = state.badge === badgeConfig.id;

              return (
                <button
                  key={badgeConfig.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    setters.setBadge(active ? null : badgeConfig.id);
                    if (navigator.vibrate) navigator.vibrate(20);
                  }}
                  className={`h-20 rounded-xl border-[1.5px] flex flex-col items-center justify-center gap-1 relative transition-all ${
                    active
                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 scale-[1.02]"
                      : disabled
                        ? "border-slate-100 dark:border-slate-800 opacity-50 cursor-not-allowed"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${badgeConfig.gradient} shadow-sm ${disabled ? "opacity-50" : ""}`}>
                    <Icon className="w-4 h-4 text-white drop-shadow-sm" />
                  </div>
                  <span className="text-[10px] font-bold truncate px-1">{badgeConfig.name}</span>
                  {active && (
                    <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-indigo-500 text-white rounded-full flex items-center justify-center border-2 border-slate-50 dark:border-slate-900">
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed text-center px-2">
          بعد از ثبت، کالایت کوتاه بررسی می‌شه و بعد برای خریدارها دیده می‌شه.
        </p>

        <button
          type="submit"
          disabled={state.submitting}
          className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-2xl font-black text-[15px] flex items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20 mt-2"
        >
          {state.submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> داره ثبت می‌شه…
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" /> ثبت کالا
            </>
          )}
        </button>
      </form>
    </div>
  );
}
