import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ImagePlus, Loader2, Tag, Trello, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createProduct, updateProduct, fetchSellerProducts } from "../../services/products.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const productSchema = z.object({
  name: z.string().min(3, "نام کالا حداقل ۳ کاراکتر باشد"),
  price: z.coerce.number().min(1000, "قیمت باید حداقل ۱۰۰۰ تومان باشد"),
  category: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["موجود", "موجودی کم", "ناموجود"]),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function AddProduct() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["sellerProducts", user?.id],
    queryFn: fetchSellerProducts,
    enabled: isEditMode,
  });

  const editingProduct = productsData?.products.find((p) => p.id === Number(editId));

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      status: "موجود",
    }
  });

  useEffect(() => {
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        price: Number(editingProduct.price),
        category: editingProduct.category,
        description: editingProduct.description,
        status: editingProduct.status as any,
      });
      setImageUrl(editingProduct.image_url || "");
    }
  }, [editingProduct, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // اینجا باید از imageCompression.ts استفاده کنید و سپس به سرور آپلود کنید
    // فعلاً فقط URL محلی را می‌سازیم برای پیش‌نمایش
    setImageUrl(URL.createObjectURL(file));
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError("");
    try {
      const payload = { ...data, image_url: imageUrl };
      if (isEditMode && editId) {
        await updateProduct(Number(editId), payload);
      } else {
        await createProduct(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
      navigate("/seller");
    } catch (err: any) {
      setServerError(err.message || "خطا در ثبت کالا");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24" dir="rtl">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-center items-center">
            <ArrowRight className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-black">{isEditMode ? "ویرایش کالا" : "ثبت کالای جدید"}</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* آپلود تصویر */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer relative w-32 h-32 rounded-3xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden hover:border-indigo-500 transition-colors">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                  <button type="button" onClick={(e) => { e.preventDefault(); setImageUrl(""); }} className="absolute top-1 left-1 w-6 h-6 bg-rose-500 rounded-full flex items-center justify-center text-white">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <ImagePlus className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-bold">افزودن عکس</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
          </div>

          {/* فیلدهای فرم */}
          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">نام کالا</label>
            <div className="relative">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                {...register("name")} 
                placeholder="مثلاً: آیفون ۱۳ پرو ۲۵۶ گیگ" 
                className="w-full h-12 pr-10 pl-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-indigo-500"
              />
            </div>
            {errors.name && <p className="text-rose-500 text-[11px] mt-1 font-bold">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">قیمت (تومان)</label>
              <input 
                {...register("price")} 
                type="number" 
                placeholder="مثلاً: 25000000" 
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-indigo-500"
              />
              {errors.price && <p className="text-rose-500 text-[11px] mt-1 font-bold">{errors.price.message}</p>}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-2 block">دسته‌بندی</label>
              <input 
                {...register("category")} 
                placeholder="موبایل" 
                className="w-full h-12 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">توضیحات</label>
            <textarea 
              {...register("description")} 
              rows={4} 
              placeholder="توضیحات کالا..." 
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-sm outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 mb-2 block">وضعیت کالا</label>
            <div className="flex gap-2">
              {["موجود", "موجودی کم", "ناموجود"].map((s) => (
                <label key={s} className="flex-1">
                  <input type="radio" value={s} {...register("status")} className="peer hidden" />
                  <div className="text-center text-xs font-bold py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 peer-checked:bg-indigo-600 peer-checked:text-white peer-checked:border-indigo-600 transition-all cursor-pointer">
                    {s}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {serverError && <div className="bg-rose-50 text-rose-600 text-xs p-3 rounded-xl text-center font-bold">{serverError}</div>}

          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full h-14 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : isEditMode ? "ذخیره تغییرات" : "ثبت و انتشار کالا"}
          </button>
        </form>
      </main>
    </div>
  );
}