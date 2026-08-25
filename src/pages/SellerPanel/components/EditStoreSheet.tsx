// src/pages/SellerPanel/components/EditStoreSheet.tsx
import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  X, Store, Phone, Package, AlignRight, Save, Loader2
} from "lucide-react";
import { StoreFormValues, storeFormSchema } from "../types";

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
  } = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues,
  });

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
                  <Store className="w-5 h-5 text-[var(--brand-primary)]" />  ‰ŸÌ„«  ›—Ê‘ê«Â
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
                  <Store className="w-3.5 h-3.5" /> ‰«„ ›—Ê‘ê«Â
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
                  <Phone className="w-3.5 h-3.5" /> ‘„«—Â  „«”
                </label>
                <input {...register("phone")} dir="ltr" className="input-base text-left" />
                {errors.phone && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.phone.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <Package className="w-3.5 h-3.5" /> œ” Âù»‰œÌ
                </label>
                <input {...register("category")} className="input-base" />
                {errors.category && (
                  <span className="text-[10px] text-rose-500 font-bold">
                    {errors.category.message}
                  </span>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5 ml-1">
                  <AlignRight className="w-3.5 h-3.5" /> œ—»«—Â ›—Ê‘ê«Â
                </label>
                <textarea {...register("description")} rows={3} className="input-base resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">«” «‰</label>
                  <input {...register("province")} className="input-base" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] ml-1">‘Â—</label>
                  <input {...register("city")} className="input-base" />
                </div>
              </div>
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full h-14 bg-gradient-to-l from-[var(--brand-secondary)] to-[var(--brand-primary)] text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-lg shadow-[var(--brand-glow)] disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> –ŒÌ—Â...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" /> –ŒÌ—Â «ÿ·«⁄« 
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