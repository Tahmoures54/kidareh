import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CheckCircle2, X, Store, Phone, Package, AlignRight, Save, Loader2,
  Eye, Edit, Share2, AlertTriangle, Trash2
} from "lucide-react";
import { formatPrice, getBadgeStyle } from "../../utils";
import { Product, StoreFormValues, storeFormSchema, ProductStatus } from "./types";

const FALLBACK_IMAGE = "https://placehold.co/300x300/1f2937/a1a1aa?text=No+Image";

const STATUS_STYLE: Record<ProductStatus, string> = {
  "موجود": "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20",
  "موجودی کم": "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/20",
  "فقط ۱ عدد": "bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-500/20",
  "ناموجود": "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700",
};

export const Toast = ({ message, onDismiss }: { message: string, onDismiss: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <motion.div layout initial={{ opacity: 0, y: -50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.9 }} className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm">
      <div className="overflow-hidden rounded-2xl shadow-2xl backdrop-blur-xl border bg-gray-900/95 dark:bg-white/95 border-gray-800 dark:border-gray-200">
        <div className="px-4 py-3.5 flex items-center gap-3">
          <div className="w-7 h-7 bg-emerald-500/20 rounded-full flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-emerald-400" /></div>
          <p className="text-white dark:text-gray-900 text-sm font-bold flex-1">{message}</p>
        </div>
      </div>
    </motion.div>
  );
};

export const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-900/90 dark:bg-white/90 backdrop-blur-md text-white dark:text-gray-900 px-3 py-2 rounded-xl shadow-xl text-xs font-bold border border-gray-800 dark:border-gray-200">
        <p className="mb-1 opacity-80">{label}</p>
        <p className="text-indigo-400 dark:text-indigo-600 flex items-center gap-1"><Eye className="w-3 h-3" /> {payload[0].value} بازدید</p>
      </div>
    );
  }
  return null;
};

interface EditStoreProps {
  isOpen: boolean;
  onClose: () => void;
  defaultValues: Partial<StoreFormValues>;
  onSave: (data: StoreFormValues) => void;
  isPending: boolean;
}

export const EditStoreSheet = ({ isOpen, onClose, defaultValues, onSave, isPending }: EditStoreProps) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<StoreFormValues>({ resolver: zodResolver(storeFormSchema), defaultValues });
  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
          <motion.div initial={{ y: "100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} className="fixed bottom-0 inset-x-0 z-50 max-w-lg mx-auto bg-white dark:bg-gray-900 rounded-t-[2.5rem] shadow-2xl border-t border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh]" dir="rtl">
            <div className="flex-shrink-0 flex flex-col items-center pt-4 pb-2 border-b border-gray-100 dark:border-gray-800 px-5">
              <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full mb-4" />
              <div className="w-full flex items-center justify-between">
                <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2"><Settings className="w-5 h-5 text-indigo-500" /> تنظیمات فروشگاه</h3>
                <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex justify-center items-center"><X className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSave)} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 custom-scrollbar">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 ml-1"><Store className="w-3.5 h-3.5" /> نام فروشگاه</label>
                <input {...register("name")} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm font-bold outline-none text-gray-900 dark:text-white" />
                {errors.name && <span className="text-[10px] text-rose-500 font-bold">{errors.name.message}</span>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 ml-1"><Phone className="w-3.5 h-3.5" /> شماره تماس</label>
                <input {...register("phone")} dir="ltr" className="w-full text-left bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm font-bold outline-none text-gray-900 dark:text-white" />
                {errors.phone && <span className="text-[10px] text-rose-500 font-bold">{errors.phone.message}</span>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 ml-1"><Package className="w-3.5 h-3.5" /> دسته‌بندی</label>
                <input {...register("category")} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm font-bold outline-none text-gray-900 dark:text-white" />
                {errors.category && <span className="text-[10px] text-rose-500 font-bold">{errors.category.message}</span>}
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5 ml-1"><AlignRight className="w-3.5 h-3.5" /> درباره فروشگاه</label>
                <textarea {...register("description")} rows={3} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm font-medium outline-none resize-none text-gray-900 dark:text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 ml-1">استان</label><input {...register("province")} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none text-gray-900 dark:text-white" /></div>
                <div className="space-y-1.5"><label className="text-xs font-bold text-gray-600 ml-1">شهر</label><input {...register("city")} className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none text-gray-900 dark:text-white" /></div>
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isPending} className="w-full h-14 bg-indigo-600 text-white rounded-2xl font-black text-sm flex justify-center items-center gap-2 shadow-lg disabled:opacity-50">
                  {isPending ? <><Loader2 className="w-5 h-5 animate-spin" /> ذخیره...</> : <><Save className="w-5 h-5" /> ذخیره اطلاعات</>}
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

interface ProductItemProps {
  product: Product;
  isUpdating: boolean;
  isDeleting: boolean;
  onStatusChange: (p: Product) => void;
  onTogglePublic: (p: Product) => void;
  onDelete: (id: number) => void;
  onShare: (p: Product) => void;
}

export const ProductItem = React.memo(({ product, isUpdating, isDeleting, onStatusChange, onTogglePublic, onDelete, onShare }: ProductItemProps) => {
  return (
    <motion.div layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ type: "spring", stiffness: 300, damping: 25 }} className="bg-white dark:bg-gray-900 rounded-[1.5rem] border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm group">
      <div className="flex gap-4 p-4">
        <div className="relative w-20 h-20 rounded-2xl bg-gray-50 dark:bg-gray-800 flex-shrink-0 border border-gray-100 dark:border-gray-700 overflow-hidden">
          <img src={product.image || FALLBACK_IMAGE} alt={product.name} onError={(e) => (e.currentTarget.src = FALLBACK_IMAGE)} className="w-full h-full object-cover" />
          {product.badge && <span className={`absolute bottom-0 inset-x-0 text-[9px] font-black py-0.5 text-center shadow-sm backdrop-blur-md ${getBadgeStyle(product.badge)}`}>{product.badge}</span>}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black line-clamp-1 mb-1 text-gray-900 dark:text-white">{product.name}</h4>
            <div className="flex items-center gap-3 text-xs mb-2">
              <span className="font-black text-indigo-600 dark:text-indigo-400">{formatPrice(product.price)} <span className="text-[9px] text-gray-400">تومان</span></span>
              <span className="flex items-center gap-1 text-gray-500 font-bold bg-gray-50 dark:bg-gray-800 px-1.5 py-0.5 rounded-md"><Eye className="w-3 h-3" /> {product.views.toLocaleString("fa-IR")}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onStatusChange(product)} disabled={isUpdating} className={`flex-1 flex justify-center gap-1 text-[10px] font-black py-1.5 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${STATUS_STYLE[product.status]}`}>
              {isUpdating ? <Loader2 className="w-3 h-3 animate-spin" /> : product.status}
            </button>
            <button onClick={() => onTogglePublic(product)} disabled={isUpdating} className={`flex-1 flex justify-center text-[10px] font-black py-1.5 rounded-xl border transition-all active:scale-95 disabled:opacity-50 ${product.isPublic ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200" : "bg-gray-50 dark:bg-gray-800 text-gray-500"}`}>
              {product.isPublic ? "منتشر شده" : "پیش‌نویس"}
            </button>
          </div>
        </div>
      </div>
      <div className="flex border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
        <Link to={`/add-product?edit=${product.id}`} className="flex-1 flex justify-center gap-1.5 py-3 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"><Edit className="w-3.5 h-3.5" /> ویرایش</Link>
        <div className="w-px bg-gray-100 dark:bg-gray-800" />
        <button onClick={() => onShare(product)} className="flex-1 flex justify-center gap-1.5 py-3 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><Share2 className="w-3.5 h-3.5" /> اشتراک</button>
        <div className="w-px bg-gray-100 dark:bg-gray-800" />
        <button onClick={() => onDelete(product.id)} className={`flex-1 flex justify-center gap-1.5 py-3 text-xs font-bold transition-colors ${isDeleting ? "bg-rose-500 text-white" : "text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10"}`}>
          {isDeleting ? <><AlertTriangle className="w-3.5 h-3.5" /> مطمئنید؟</> : <><Trash2 className="w-3.5 h-3.5" /> حذف</>}
        </button>
      </div>
    </motion.div>
  );
});