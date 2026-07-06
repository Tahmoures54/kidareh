import React, { useCallback, useRef, useEffect, useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, AlertCircle, MapPin } from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { iranCities } from "@data/processed/iranCities";
import { apiRequest } from "../../utils/api";

import type { UserRole } from "./RoleSelectionScreen";
import CategorySelect from "../CompleteProfile/components/CategorySelect";

const MapModal = lazy(() => import("../CompleteProfile/components/MapModal"));

/* ====================== COMPONENT ====================== */

interface RegistrationFormScreenProps {
  phone: string;
  role: UserRole;
  onBack: () => void;
}

export default function RegistrationFormScreen({
  phone,
  role,
  onBack,
}: RegistrationFormScreenProps) {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const isMountedRef = useRef(true);

  const [formData, setFormData] = useState({
    name: "",
    province: "",
    city: "",
    storeName: "",
    storeCategory: "",
    address: "",
    referral: "",
  });

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLocationSelect = useCallback((lat: number, lng: number) => {
    setLocation({ lat, lng });
    setShowMap(false);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const provinces = [...new Set(iranCities.map((c) => c.province))].sort();
  const cities = iranCities.filter((c) => c.province === formData.province);

  const handleChange = useCallback(
    (field: string, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (field === "province") setFormData((prev) => ({ ...prev, city: "" }));
    },
    []
  );

  const validateForm = useCallback(() => {
    if (role === "seller") {
      if (!formData.storeName.trim()) return "نام فروشگاه را وارد کنید.";
      if (!formData.storeCategory) return "صنف فعالیت را انتخاب کنید.";
      if (!location) return "موقعیت مکانی را انتخاب کنید.";
    }
    if (!formData.province || !formData.city) {
      return "لطفاً استان و شهر خود را انتخاب کنید.";
    }
    return "";
  }, [formData, location, role]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setLoading(true);
      try {
        const payload: Record<string, unknown> = {
          role,
          name: role === "seller" ? formData.storeName : formData.name || phone,
          store_name: role === "seller" ? formData.storeName : undefined,
          store_category: role === "seller" ? formData.storeCategory : undefined,
          address: role === "seller" ? formData.address : undefined,
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

        if (isMountedRef.current && res?.user) {
          updateUser(res.user);
          // Navigate to appropriate dashboard after a brief delay
          setTimeout(() => {
            if (isMountedRef.current) {
              if (role === "seller") {
                navigate("/seller", { replace: true, state: { successMsg: "خوش آمدید! پروفایل شما تکمیل شد." } });
              } else if (role === "marketer") {
                navigate("/referral", { replace: true });
              } else {
                navigate("/", { replace: true });
              }
            }
          }, 500);
        }
      } catch (err: any) {
        if (isMountedRef.current) {
          setError(err?.message || "خطا در برقراری ارتباط با سرور");
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [role, formData, location, phone, updateUser, navigate, validateForm]
  );

  const isBuyer = role === "buyer";
  const isSeller = role === "seller";

  return (
    <div className="min-h-[100dvh] w-full max-w-md mx-auto bg-white dark:bg-[#0B0F19] flex flex-col relative overflow-hidden font-sans" dir="rtl">
      {/* Background Halos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/15 dark:bg-cyan-500/20 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 dark:bg-violet-500/15 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-4 z-10">
        <button
          onClick={onBack}
          disabled={loading}
          className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          aria-label="بازگشت"
        >
          <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-black text-gray-900 dark:text-white">تکمیل پروفایل</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {isSeller ? "اطلاعات فروشگاه" : "اطلاعات شخصی"}
          </p>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto hide-scrollbar z-10">
        <form onSubmit={handleSubmit} className="px-5 py-6 space-y-6 pb-20">
          {/* Name Field */}
          {isBuyer && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="text-xs font-bold text-slate-500 mb-2 block">نام</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="نام خود را وارد کنید"
                className="input-base w-full px-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                disabled={loading}
              />
            </motion.div>
          )}

          {/* Store Name Field (Sellers Only) */}
          {isSeller && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <label className="text-xs font-bold text-slate-500 mb-2 block">
                نام فروشگاه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.storeName}
                onChange={(e) => handleChange("storeName", e.target.value)}
                placeholder="نام فروشگاهتان"
                className="input-base w-full px-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                disabled={loading}
              />
            </motion.div>
          )}

          {/* Category Select (Sellers Only) */}
          {isSeller && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <CategorySelect value={formData.storeCategory} onChange={(v) => handleChange("storeCategory", v)} storeName={formData.storeName} />
            </motion.div>
          )}

          {/* Province Selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isSeller ? 0.3 : 0.2 }}>
            <label className="text-xs font-bold text-slate-500 mb-2 block">
              استان <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.province}
              onChange={(e) => handleChange("province", e.target.value)}
              className="input-base w-full px-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
              disabled={loading}
            >
              <option value="">انتخاب استان...</option>
              {provinces.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </motion.div>

          {/* City Selector */}
          {formData.province && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <label className="text-xs font-bold text-slate-500 mb-2 block">
                شهر <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.city}
                onChange={(e) => handleChange("city", e.target.value)}
                className="input-base w-full px-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
                disabled={loading}
              >
                <option value="">انتخاب شهر...</option>
                {cities.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </motion.div>
          )}

          {/* Address Field (Sellers Only) */}
          {isSeller && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <label className="text-xs font-bold text-slate-500 mb-2 block">آدرس</label>
              <textarea
                value={formData.address}
                onChange={(e) => handleChange("address", e.target.value)}
                placeholder="آدرس فروشگاه خود را بنویسید"
                className="input-base w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none resize-none min-h-[100px]"
                disabled={loading}
              />
            </motion.div>
          )}

          {/* Location Map Button (Sellers Only) */}
          {isSeller && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <button
                type="button"
                onClick={() => setShowMap(true)}
                className={`w-full px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between font-bold text-sm ${
                  location
                    ? "border-green-500 bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400"
                    : "border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-cyan-500"
                }`}
              >
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {location ? "موقعیت انتخاب شد ✓" : "انتخاب موقعیت مکانی"}
                </div>
              </button>
            </motion.div>
          )}

          {/* Referral Code (Optional) */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: isSeller ? 0.6 : 0.3 }}>
            <label className="text-xs font-bold text-slate-500 mb-2 block">کد معرف (اختیاری)</label>
            <input
              type="text"
              value={formData.referral}
              onChange={(e) => handleChange("referral", e.target.value)}
              placeholder="کد معرف را وارد کنید"
              className="input-base w-full px-4 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none"
              disabled={loading}
            />
          </motion.div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50"
              >
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <motion.button
            type="submit"
            whileTap={{ scale: 0.97 }}
            disabled={loading}
            className="w-full h-16 bg-gradient-to-r from-cyan-500 via-teal-400 to-violet-500 text-white rounded-[22px] font-black text-base shadow-xl shadow-cyan-500/30 disabled:opacity-40 disabled:shadow-none transition-all flex items-center justify-center gap-3 group mt-4"
          >
            {loading ? (
              <motion.div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>در حال ثبت‌نام...</span>
              </motion.div>
            ) : (
              <motion.div className="flex items-center gap-3">
                تکمیل پروفایل
                <ArrowRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              </motion.div>
            )}
          </motion.button>
        </form>
      </main>

      {/* Map Modal */}
      <Suspense fallback={<div />}>
        <MapModal
          isOpen={showMap}
          onClose={() => setShowMap(false)}
          location={location}
          setLocation={handleLocationSelect}
        />
      </Suspense>
    </div>
  );
}
