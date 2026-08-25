import React, { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react"; // فریمورک یکپارچه شد
import {
  LogOut, Loader2, AlertCircle, ShoppingBag, 
  Megaphone, Map as MapIcon, ChevronRight, Sparkles, Store, Gift
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { iranCities } from "@data/processed/iranCities";
import { apiRequest } from "../../utils/api";
import CategorySelect from "./components/CategorySelect";

const MapModal = lazy(() => import("./components/MapModal"));

const ROLES = [
  { role: "seller" as const, label: "فروشگاه دارم", desc: "ثبت رایگان کالا و فروش سریع‌تر", icon: Store },
  { role: "buyer" as const, label: "خریدار هستم", desc: "جستجو و خرید از فروشگاه‌های اطراف", icon: ShoppingBag },
  { role: "marketer" as const, label: "بازاریاب", desc: "کسب درآمد از معرفی فروشندگان", icon: Megaphone },
];

const stepVariants = {
  hidden: { opacity: 0, x: 50 }, // در RTL حرکت از راست به چپ با عدد مثبت
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 }
};

export default function CompleteProfile() {
  const { user, isLoading, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedRole, setSelectedRole] = useState<"seller" | "buyer" | "marketer">("seller");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // nationalCode حذف شد چون UI نداشت (کد مرده بود)
  const [formData, setFormData] = useState({
    name: "",
    province: "",
    city: "",
    storeName: "",
    storeCategory: "",
    address: "",
    referral: ""
  });
  
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);

  const provinces = [...new Set(iranCities.map((c) => c.province))].sort();
  const cities = iranCities.filter((c) => c.province === formData.province);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "province") setFormData((prev) => ({ ...prev, city: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (selectedRole === "seller" && (!formData.storeName || !formData.storeCategory || !location)) {
      return setError("لطفاً نام فروشگاه، صنف فعالیت و موقعیت مکانی را تکمیل کنید.");
    }
    if (!formData.province || !formData.city) {
      return setError("لطفاً استان و شهر خود را انتخاب کنید.");
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        role: selectedRole,
        name: selectedRole === "seller" ? formData.storeName : formData.name,
        store_name: selectedRole === "seller" ? formData.storeName : undefined,
        store_category: selectedRole === "seller" ? formData.storeCategory : undefined,
        address: selectedRole === "seller" ? formData.address : undefined,
        province: formData.province,
        city: formData.city,
        lat: location?.lat,
        lng: location?.lng,
        referral_code: formData.referral || undefined,
      };

      const res = await apiRequest<{ user: any }>("/api/auth/complete-profile", {
        method: "POST",
        auth: true,
        body: payload,
      });

      if (res?.user) setUser(res.user);
      navigate(selectedRole === "seller" ? "/seller" : "/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "خطا در ارتباط با سرور";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--brand-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col font-sans" dir="rtl">
      
      {/* Header با ایندیکاتور مراحل */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#0B0F19]/80 backdrop-blur-2xl border-b border-slate-200/50 dark:border-slate-800/50 px-5 py-4 flex items-center justify-between">
        <button
          onClick={() => (step === 2 ? setStep(1) : navigate(-1))}
          className="flex items-center gap-1 text-sm font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
          {step === 2 ? "مرحله قبل" : "بازگشت"}
        </button>

        <div className="flex items-center gap-2">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                step >= s ? "w-6 bg-[var(--brand-primary)]" : "w-4 bg-slate-200 dark:bg-slate-700"
              }`}
            />
          ))}
        </div>

        <button
          onClick={logout}
          className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-2 rounded-xl transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 px-5 pt-8 max-w-md mx-auto w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-4 text-rose-600 dark:text-rose-400 text-sm font-bold flex gap-2"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* مرحله اول: انتخاب نقش */}
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="space-y-4 h-full flex flex-col"
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)]/10 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[var(--brand-glow)]"
                >
                  <Sparkles className="w-8 h-8 text-[var(--brand-primary)]" />
                </motion.div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">قصد شما چیست؟</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">انتخاب شما را به مقصد سریع‌تر می‌رساند</p>
              </div>

              <div className="space-y-3 flex-1">
                {ROLES.map((r, i) => (
                  <motion.button
                    key={r.role}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => {
                      setSelectedRole(r.role);
                      setStep(2);
                      setError("");
                    }}
                    className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 text-right transition-all duration-300 group ${
                      selectedRole === r.role
                        ? "border-transparent shadow-xl scale-[0.98]"
                        : "bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
                    }`}
                    style={
                      selectedRole === r.role
                        ? { backgroundImage: `linear-gradient(to left, var(--brand-secondary), var(--brand-primary))`, color: "white" }
                        : {}
                    }
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      selectedRole === r.role ? "bg-white/20" : "bg-slate-100 dark:bg-slate-700 group-hover:bg-[var(--brand-primary)]/10"
                    }`}>
                      <r.icon className={`w-6 h-6 ${selectedRole === r.role ? "text-white" : "text-slate-500 dark:text-slate-400 group-hover:text-[var(--brand-primary)]"}`} />
                    </div>
                    <div>
                      <p className="font-black text-base">{r.label}</p>
                      <p className={`text-xs mt-1 ${selectedRole === r.role ? "text-white/80" : "text-slate-400 dark:text-slate-500"}`}>
                        {r.desc}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* مرحله دوم: فرم اطلاعات */}
          {step === 2 && (
            <motion.form
              key="step2"
              variants={stepVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="space-y-5 pb-10"
            >
              <div className="text-center mb-4">
                <h2 className="text-xl font-black text-slate-900 dark:text-white">
                  {selectedRole === "seller" ? "اطلاعات فروشگاه" : "اطلاعات هویتی"}
                </h2>
              </div>
              
              {selectedRole === "seller" ? (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">نام فروشگاه <span className="text-rose-500">*</span></label>
                    <input type="text" value={formData.storeName} onChange={e => handleChange('storeName', e.target.value)} placeholder="مثال: کی داره؟ مارکت" className="input-base w-full h-14" />
                  </div>
                  
                  <CategorySelect value={formData.storeCategory} onChange={v => handleChange('storeCategory', v)} storeName={formData.storeName} />
                  
                  <div>
                    <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">آدرس دقیق</label>
                    <input type="text" value={formData.address} onChange={e => handleChange('address', e.target.value)} placeholder="خیابان، کوچه، پلاک..." className="input-base w-full h-14" />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">موقعیت روی نقشه <span className="text-rose-500">*</span></label>
                    <button type="button" onClick={() => setShowMap(true)} className={`w-full flex items-center justify-between h-14 px-5 rounded-2xl font-bold border-2 transition-all input-base ${
                      location ? "bg-emerald-50 dark:bg-emerald-500/10 !border-emerald-200 dark:!border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : "!text-slate-600 dark:!text-slate-300 hover:!border-[var(--brand-primary)]"
                    }`}>
                      <span className="flex items-center gap-2">
                        <MapIcon className="w-5 h-5"/> {location ? "مکان روی نقشه ثبت شد ✓" : "انتخاب موقعیت مکانی"}
                      </span>
                      {location && <span className="text-xs opacity-70">تغییر</span>}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">نام و نام خانوادگی <span className="text-rose-500">*</span></label>
                  <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} placeholder="نام خود را وارد کنید" className="input-base w-full h-14" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">استان <span className="text-rose-500">*</span></label>
                  <select value={formData.province} onChange={e => handleChange('province', e.target.value)} className="input-base w-full h-14 appearance-none">
                    <option value="">انتخاب استان...</option>
                    {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1">شهر <span className="text-rose-500">*</span></label>
                  <select value={formData.city} onChange={e => handleChange('city', e.target.value)} disabled={!formData.province} className="input-base w-full h-14 appearance-none disabled:opacity-50">
                    <option value="">انتخاب شهر...</option>
                    {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              {/* فیلد کد دعوت که قبلاً استیت داشت اما UI نداشت */}
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-500 dark:text-slate-400 px-1 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5" /> کد دعوت (اختیاری)
                </label>
                <input type="text" value={formData.referral} onChange={e => handleChange('referral', e.target.value)} placeholder="اگر کد دعوتی دارید وارد کنید" className="input-base w-full h-14" />
              </div>

              <motion.button 
                type="submit" 
                disabled={submitting} 
                whileTap={{ scale: 0.97 }}
                className="w-full h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white rounded-2xl font-black text-base mt-4 flex items-center justify-center shadow-lg shadow-[var(--brand-glow)] disabled:opacity-70 transition-all"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin"/> : "ورود به کی‌داره"}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>
      </main>

      <Suspense fallback={<div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center backdrop-blur-sm"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
        <MapModal isOpen={showMap} onClose={() => setShowMap(false)} location={location} setLocation={setLocation} />
      </Suspense>
    </div>
  );
}