import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Store, Phone, AlignRight, Save, Loader2, MapPin
} from "lucide-react";
import { StoreFormValues, storeFormSchema } from "../types";
import { citiesInProvince, iranProvinceNames } from "../../../data/processed/iranCities";
import CategoryField from "../../../components/category/CategoryField";

interface EditStoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues: Partial<StoreFormValues>;
  onSave: (data: StoreFormValues) => void;
  isPending: boolean;
}

export const EditStoreSheet = ({
  isOpen,
  onClose,
  defaultValues,
  onSave,
  isPending,
}: EditStoreSheetProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues,
  });

  const province = watch("province") || "";
  const city = watch("city") || "";
  const provinceCities = citiesInProvince(province);
  const cityInList = provinceCities.some((item) => item.name === city);

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-0 inset-x-0 z-50 max-w-lg mx-auto bg-[var(--bg-secondary)] rounded-t-[2.5rem] shadow-2xl border-t border-[var(--border-light)] overflow-hidden flex flex-col max-h-[85vh]"
            dir="rtl"
          >
            <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 border-b border-[var(--border-light)] px-5">
              <div className="w-12 h-1.5 bg-[var(--border-light)] rounded-full mb-4" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-2">
                  <Store className="w-5 h-5 text-[var(--brand-primary)]" /> ویرایش فروشگاه
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-[var(--bg-tertiary)] flex justify-center items-center text-[var(--text-muted)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <form
              onSubmit={handleSubmit(onSave)}
              className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <Store className="w-3.5 h-3.5" /> نام فروشگاه
                </label>
                <input {...register("name")} className="input-base" />
                {errors.name && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.name.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <Phone className="w-3.5 h-3.5" /> شماره تماس
                </label>
                <input {...register("phone")} dir="ltr" className="input-base text-left" />
                {errors.phone && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.phone.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <CategoryField
                  value={watch("category") || ""}
                  onChange={(value) => setValue("category", value, { shouldValidate: true })}
                  label="دسته‌بندی"
                  required
                />
                {errors.category && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.category.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <AlignRight className="w-3.5 h-3.5" /> توضیح فروشگاه
                </label>
                <textarea {...register("description")} rows={3} className="input-base resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">استان</label>
                  <select
                    {...register("province", {
                      onChange: () => setValue("city", ""),
                    })}
                    className="input-base"
                  >
                    <option value="">انتخاب استان</option>
                    {iranProvinceNames.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">شهر</label>
                  <select {...register("city")} className="input-base" disabled={!province}>
                    <option value="">{province ? "انتخاب شهر" : "اول استان"}</option>
                    {!cityInList && city ? <option value={city}>{city}</option> : null}
                    {provinceCities.map((item) => (
                      <option key={`${item.name}-${item.province}`} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] ml-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> آدرس
                </label>
                <input {...register("address")} className="input-base" />
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-lg shadow-[var(--brand-glow)] disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> در حال ذخیره…
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> ذخیره فروشگاه
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
