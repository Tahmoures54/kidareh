import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  UploadCloud,
  Image as ImageIcon,
  X,
  Package,
  CheckCircle2,
  Camera,
  Plus,
  Sparkles,
  AlignRight,
  List,
  Loader2,
  TrendingUp,
  ChevronDown,
  Check,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { categoriesData } from "@data/processed/categories";
import { BADGES_LIST } from "../../components/badges"; 
import { fmtPrice } from "./utils";
import { useAddProduct } from "./components/hooks"; 
import Toast from "./components/Toast";
import SegmentedControl from "./components/SegmentedControl";

export default function AddProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { refs, state, setters, actions } = useAddProduct(user);

  useEffect(() => {
    window.scrollTo(0, 0);
    // 🔴 تغییر به کالا
    document.title = "افزودن کالا | کی‌داره؟";
  }, []);

  if (!user)
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
      </div>
    );

  const totalBadgesAvailable = Object.values(state.inventory).reduce(
    (a, b) => a + b,
    0
  );

  return (
    <div
      className="min-h-screen bg-[var(--bg-primary)] pb-36 text-[var(--text-primary)] transition-colors font-sans"
      dir="rtl"
    >
      <AnimatePresence>
        {state.toast && (
          <Toast
            key={state.toast.id}
            msg={state.toast.msg}
            type={state.toast.type}
          />
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 glass border-b border-[var(--border-light)]/60 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3 transition-colors">
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center transition-colors hover:bg-[var(--border-light)]/50"
          >
            <ArrowRight className="w-5 h-5 text-[var(--text-primary)]" />
          </motion.button>
          <div>
            {/* 🔴 تغییر به کالا */}
            <h1 className="text-lg font-black tracking-tight leading-none text-[var(--text-primary)]">
              افزودن کالای جدید
            </h1>
            <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 leading-none">
              مشخصات کالای خود را وارد کنید
            </p>
          </div>
        </div>
      </header>

      {/* ── Main Form ── */}
      <form
        onSubmit={actions.handleSubmit}
        className="px-5 py-6 space-y-6 max-w-lg mx-auto"
      >
        {/* === بخش ۱: تصویر کالا === */}
        <section>
          <div className="flex items-center justify-between mb-3 px-1">
            <label className="text-sm font-black flex items-center gap-2 text-[var(--text-primary)]">
              <div className="p-1.5 bg-[var(--brand-primary)]/10 rounded-xl text-[var(--brand-primary)]">
                <ImageIcon className="w-[18px] h-[18px]" />
              </div>
              تصویر کالا
            </label>
            <span className="text-[10px] font-bold text-[var(--text-muted)] bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-lg">
              اختیاری
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            ref={refs.fileRef}
            onChange={actions.handleImage}
            className="hidden"
          />
          <input
            type="file"
            accept="image/*"
            capture="environment"
            ref={refs.cameraRef}
            onChange={actions.handleImage}
            className="hidden"
          />

          <AnimatePresence mode="wait">
            {state.compressing ? (
              <motion.div
                key="comp"
                className="h-56 bg-[var(--brand-primary)]/5 flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[var(--brand-primary)]/30"
              >
                <Loader2 className="w-8 h-8 text-[var(--brand-primary)] animate-spin" />
              </motion.div>
            ) : state.preview ? (
              <motion.div
                key="prev"
                className="relative h-64 rounded-[24px] overflow-hidden group border border-[var(--border-light)] shadow-sm"
              >
                <img
                  src={state.preview}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={actions.removeImage}
                  className="absolute top-3 right-3 w-10 h-10 bg-black/40 hover:bg-rose-500 text-white backdrop-blur-md rounded-2xl flex items-center justify-center shadow-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div key="up" className="flex gap-3">
                <button
                  type="button"
                  onClick={() => refs.fileRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center gap-3 h-32 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-medium)] rounded-[24px] hover:border-[var(--brand-primary)] transition-colors group"
                >
                  <UploadCloud className="w-7 h-7 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    انتخاب از گالری
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => refs.cameraRef.current?.click()}
                  className="w-32 flex flex-col items-center justify-center gap-3 h-32 bg-[var(--bg-secondary)] border border-dashed border-[var(--border-medium)] rounded-[24px] hover:border-[var(--brand-primary)] transition-colors group"
                >
                  <Camera className="w-7 h-7 text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors" />
                  <span className="text-xs font-bold text-[var(--text-secondary)]">
                    دوربین
                  </span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* === بخش ۲: اطلاعات کالا === */}
        <section className="bg-[var(--bg-secondary)] rounded-[32px] border border-[var(--border-light)] p-5 shadow-sm shadow-[var(--shadow-color)] space-y-5">
          {/* نام کالا */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-secondary)] ml-1 flex items-center gap-1">
              نام کالا <span className="text-rose-500">*</span> {/* 🔴 تغییر به کالا */}
            </label>
            <div className="relative group">
              <Package className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)]" />
              <input
                type="text"
                value={state.name}
                onChange={(e) => setters.setName(e.target.value)}
                placeholder="مثلاً: دوچرخه کوهستان جاینت"
                className="input-base pr-11 text-sm font-bold"
              />
            </div>
          </div>

          {/* دسته‌بندی */}
          <div className="space-y-2">
            <label className="text-xs font-black text-[var(--text-secondary)] ml-1 flex items-center gap-1">
              دسته‌بندی <span className="text-rose-500">*</span>
            </label>
            <div className="relative group">
              <List className="absolute right-4 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[var(--text-muted)]" />
              <select
                value={state.category}
                onChange={(e) => setters.setCategory(e.target.value)}
                className="input-base pr-11 pl-10 appearance-none text-sm font-bold bg-[var(--bg-tertiary)] focus:bg-[var(--bg-secondary)]"
              >
                <option value="" disabled className="text-[var(--text-muted)]">
                  انتخاب گروه کالا...
                </option>
                {categoriesData?.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
            </div>
          </div>

          {/* قیمت و وضعیت */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)] ml-1">
                قیمت (تومان)
              </label>
              <input
                type="text"
                value={state.price}
                onChange={(e) => setters.setPrice(fmtPrice(e.target.value))}
                placeholder="توافقی"
                dir="ltr"
                className="input-base text-left text-sm font-black tabular-nums"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-[var(--text-secondary)] ml-1">
                موجودی کالا
              </label>
              <div className="h-[52px]">
                <SegmentedControl
                  options={["موجود", "ناموجود"]}
                  value={state.status}
                  onChange={(v) => setters.setStatus(v as "موجود" | "ناموجود")}
                />
              </div>
            </div>
          </div>
        </section>

        {/* === بخش ۳: توضیحات و هوش مصنوعی === */}
        <section className="bg-[var(--bg-secondary)] rounded-[32px] border border-[var(--border-light)] p-5 shadow-sm shadow-[var(--shadow-color)] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-black flex items-center gap-2 text-[var(--text-primary)]">
              <div className="p-1.5 bg-[var(--brand-primary)]/10 rounded-xl text-[var(--brand-primary)]">
                <AlignRight className="w-[18px] h-[18px]" />
              </div>
              توضیحات تکمیلی
            </label>
            <button
              type="button"
              onClick={actions.generateDesc}
              disabled={state.genDesc || !state.name}
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl disabled:opacity-50 disabled:grayscale transition-all shadow-md shadow-amber-500/20 active:scale-95"
            >
              {state.genDesc ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 text-amber-100" />
              )}
              هوش مصنوعی
            </button>
          </div>
          <textarea
            value={state.desc}
            onChange={(e) => setters.setDesc(e.target.value)}
            placeholder="هر توضیحاتی که خریدار باید بداند را اینجا بنویسید..."
            rows={4}
            className="input-base resize-none text-sm font-medium leading-relaxed"
          />
        </section>

        {/* === بخش ۴: برچسب‌های فروش (Badges) === */}
        <section>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-black flex items-center gap-2 text-[var(--text-primary)]">
              <div className="p-1.5 bg-rose-500/10 rounded-xl text-rose-500">
                <TrendingUp className="w-[18px] h-[18px]" />
              </div>
              برچسب ویژه (نردبان)
            </h3>
            {state.loadingInventory ? (
              <Loader2 className="w-4 h-4 text-[var(--text-muted)] animate-spin" />
            ) : (
              <span
                className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
                  totalBadgesAvailable === 0
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : "bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                }`}
              >
                {totalBadgesAvailable} برچسب دارید
              </span>
            )}
          </div>

          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x px-1 -mx-1">
            {/* دکمه خرید برچسب جدید */}
            <button
              type="button"
              onClick={() => navigate("/buy-badge")}
              className="snap-start flex-shrink-0 w-[105px] p-3.5 rounded-[24px] border-2 border-dashed border-[var(--border-medium)] bg-[var(--bg-tertiary)] flex flex-col items-center justify-center gap-2.5 hover:border-[var(--brand-primary)] transition-colors active:scale-95"
            >
              <div className="w-10 h-10 rounded-[14px] bg-[var(--bg-secondary)] border border-[var(--border-light)] flex items-center justify-center shadow-sm text-[var(--text-secondary)]">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-black text-[var(--text-secondary)] text-center leading-tight">
                خرید
                <br />
                برچسب جدید
              </span>
            </button>

            {/* لیست برچسب‌ها */}
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
                  className={`snap-start flex-shrink-0 w-[115px] p-3.5 rounded-[24px] border-[1.5px] flex flex-col items-center gap-3 transition-all relative ${
                    active
                      ? "border-[var(--brand-primary)] shadow-md shadow-[var(--brand-glow)] bg-[var(--brand-primary)]/5 scale-[1.02]"
                      : disabled
                      ? "border-[var(--border-light)] bg-[var(--bg-tertiary)]/50 opacity-60 grayscale cursor-not-allowed"
                      : "border-[var(--border-light)] bg-[var(--bg-secondary)] hover:border-[var(--border-medium)] active:scale-95"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-[16px] flex items-center justify-center bg-gradient-to-br ${
                      badgeConfig.gradient
                    } shadow-inner ${disabled ? "opacity-70" : ""}`}
                  >
                    <Icon
                      className={`w-[22px] h-[22px] ${
                        active ? "text-white" : "text-white/90"
                      } drop-shadow-sm`}
                    />
                  </div>
                  <div className="text-center w-full">
                    <span
                      className={`block text-xs font-black leading-tight mb-1 truncate ${
                        active
                          ? "text-[var(--brand-primary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {badgeConfig.name}
                    </span>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        disabled
                          ? "bg-rose-500/10 text-rose-500"
                          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {count} عدد
                    </span>
                  </div>
                  {active && (
                    <motion.div
                      layoutId="badge-check"
                      className="absolute -top-2.5 -right-2.5 w-[22px] h-[22px] bg-[var(--brand-primary)] text-white rounded-full flex items-center justify-center shadow-md border-2 border-[var(--bg-secondary)]"
                    >
                      <Check className="w-3 h-3" strokeWidth={3} />
                    </motion.div>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      </form>

      {/* ── Submit Button (Floating) ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent pt-10 pb-[max(1rem,env(safe-area-inset-bottom))] px-5 pointer-events-none">
        <div className="max-w-lg mx-auto pointer-events-auto">
          <button
            type="submit"
            onClick={actions.handleSubmit}
            disabled={state.submitting}
            className="w-full h-14 rounded-[20px] font-black text-[15px] flex items-center justify-center gap-2 transition-all btn-primary"
          >
            {state.submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                در حال ثبت...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                افزودن کالا {/* 🔴 تغییر به کالا */}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}