import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { User, Store, LogOut, Loader2, AlertCircle, ShoppingBag, Megaphone, Map as MapIcon, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { iranCities } from "@data/processed/iranCities";
import { apiRequest } from "../../utils/api";

// کامپوننت‌های خُرد شده
import CategorySelect from "./components/CategorySelect";
const MapModal = lazy(() => import("./components/MapModal"));

const ROLES = [
  { role: "seller", label: "فروشگاه دارم", desc: "ثبت رایگان کالا و فروش سریع‌تر", icon: Store, gradient: "from-cyan-500 to-teal-500" },
  { role: "buyer", label: "خریدار هستم", desc: "جستجو و خرید از فروشگاه‌های اطراف", icon: ShoppingBag, gradient: "from-violet-500 to-purple-500" },
  { role: "marketer", label: "بازاریاب", desc: "کسب درآمد از معرفی فروشندگان", icon: Megaphone, gradient: "from-orange-400 to-rose-500" },
] as const;

export default function CompleteProfile() {
  const { user, isLoading, logout, setUser } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<"buyer" | "seller" | "marketer">("seller");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "", nationalCode: "", province: "", city: "",
    storeName: "", storeCategory: "", address: "", referral: ""
  });
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showMap, setShowMap] = useState(false);

  const provinces = [...new Set(iranCities.map((c) => c.province))].sort();
  const cities = iranCities.filter((c) => c.province === formData.province);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === "seller" && (!formData.storeName || !formData.storeCategory || !location)) {
      return setError("لطفاً فیلدهای ضروری و نقشه را تکمیل کنید.");
    }

    setSubmitting(true);
    try {
      const payload = {
        role,
        name: role === "seller" ? formData.storeName : formData.name,
        store_name: role === "seller" ? formData.storeName : undefined,
        store_category: role === "seller" ? formData.storeCategory : undefined,
        address: role === "seller" ? formData.address : undefined,
        province: formData.province, city: formData.city,
        lat: location?.lat, lng: location?.lng,
        referral_code: formData.referral || undefined,
      };

      const res = await apiRequest<any>("/api/auth/complete-profile", { method: "POST", auth: true, body: payload });
      if (res?.user) setUser(res.user);
      navigate(role === "seller" ? "/seller" : "/");
    } catch (err: any) {
      setError(err.message || "خطا در ارتباط با سرور");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-cyan-500" /></div>;

  return (
    <div className="min-h-[100dvh] bg-[#F8FAFC] dark:bg-[#0B0F19] flex flex-col font-sans" dir="rtl">
      
      <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl px-5 py-4 flex items-center justify-between shadow-sm">
        <button onClick={() => step === 2 ? setStep(1) : navigate(-1)} className="flex items-center text-[13px] font-black"><ChevronRight className="w-5 h-5"/> {step === 2 ? "بازگشت" : "خروج"}</button>
        <h1 className="text-[15px] font-black">پروفایل کاربری</h1>
        <button onClick={logout} className="text-rose-500"><LogOut className="w-5 h-5" /></button>
      </header>

      <main className="flex-1 px-5 pt-8 max-w-md mx-auto w-full">
        {error && <div className="mb-6 bg-rose-50 border border-rose-200 rounded-[20px] p-4 text-rose-700 text-[13px] font-bold flex gap-2"><AlertCircle className="w-5 h-5"/> {error}</div>}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-[26px] font-black text-center mb-8">قصد شما چیست؟</h2>
            {ROLES.map(r => (
              <button key={r.role} onClick={() => { setRole(r.role); setStep(2); }} className={`w-full flex items-center gap-4 p-5 rounded-[28px] border text-right transition-all ${role === r.role ? `bg-gradient-to-r ${r.gradient} text-white shadow-lg` : 'bg-white'}`}>
                <r.icon className={`w-8 h-8 ${role === r.role ? 'text-white' : 'text-slate-400'}`} />
                <div>
                  <p className="font-black text-[16px]">{r.label}</p>
                  <p className="text-[12px] opacity-80">{r.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-5 pb-10">
            <h2 className="text-[24px] font-black text-center mb-6">{role === "seller" ? "اطلاعات فروشگاه" : "اطلاعات هویتی"}</h2>
            
            {role === "seller" ? (
              <>
                <div>
                  <label className="block text-[12px] font-black mb-2">نام فروشگاه *</label>
                  <input type="text" value={formData.storeName} onChange={e => handleChange('storeName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-[20px] px-4 h-14 font-bold" />
                </div>
                
                {/* کامپوننت هوشمند جستجوی دسته بندی */}
                <CategorySelect value={formData.storeCategory} onChange={v => handleChange('storeCategory', v)} storeName={formData.storeName} />
                
                <div>
                  <label className="block text-[12px] font-black mb-2">آدرس *</label>
                  <input type="text" value={formData.address} onChange={e => handleChange('address', e.target.value)} className="w-full bg-white border border-slate-200 rounded-[20px] px-4 h-14 font-bold" />
                </div>

                <button type="button" onClick={() => setShowMap(true)} className={`w-full flex items-center justify-between h-14 px-5 rounded-[20px] font-black border ${location ? "bg-cyan-50 border-cyan-200 text-cyan-600" : "bg-slate-100 border-slate-200 text-slate-900"}`}>
                  <span className="flex items-center gap-2"><MapIcon className="w-5 h-5"/> {location ? "مکان ثبت شد" : "انتخاب روی نقشه *"}</span>
                </button>
              </>
            ) : (
              <div>
                <label className="block text-[12px] font-black mb-2">نام شما *</label>
                <input type="text" value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-white border border-slate-200 rounded-[20px] px-4 h-14 font-bold" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-black mb-2">استان *</label>
                <select value={formData.province} onChange={e => handleChange('province', e.target.value)} className="w-full bg-white border border-slate-200 rounded-[20px] px-4 h-14 font-bold appearance-none">
                  <option value="">انتخاب...</option>
                  {provinces.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-black mb-2">شهر *</label>
                <select value={formData.city} onChange={e => handleChange('city', e.target.value)} disabled={!formData.province} className="w-full bg-white border border-slate-200 rounded-[20px] px-4 h-14 font-bold appearance-none">
                  <option value="">انتخاب...</option>
                  {cities.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <button type="submit" disabled={submitting} className="w-full h-14 bg-cyan-500 text-white rounded-[20px] font-black mt-8 flex items-center justify-center">
              {submitting ? <Loader2 className="w-6 h-6 animate-spin"/> : "ثبت اطلاعات و ورود"}
            </button>
          </form>
        )}
      </main>

      <Suspense fallback={null}>
        <MapModal isOpen={showMap} onClose={() => setShowMap(false)} location={location} setLocation={setLocation} />
      </Suspense>

    </div>
  );
}