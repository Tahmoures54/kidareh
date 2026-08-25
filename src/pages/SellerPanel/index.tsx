import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ImagePlus, Loader2, Tag, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { createProduct, updateProduct, fetchSellerProducts } from "../../services/products.service";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "../../components/ui/PageHeader";
import { HintCard } from "../../components/ui/HintCard";

/** وضعیت‌ها مطابق سرور */
const STATUS_OPTIONS = [
  { value: "موجود", label: "موجود", hint: "آماده فروش" },
  { value: "فقط ۱ عدد", label: "فقط ۱ عدد", hint: "موجودی کم" },
  { value: "ناموجود", label: "ناموجود", hint: "فعلاً نیست" },
] as const;

const productSchema = z.object({
  name: z.string().min(2, "نام کالا را بنویسید (حداقل ۲ حرف)"),
  price: z.coerce.number().min(1000, "قیمت را به تومان وارد کنید"),
  category: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["موجود", "فقط ۱ عدد", "ناموجود"]),
});

type ProductFormValues = z.infer<typeof productSchema>;

export default function SellerProductForm() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("edit");
  const isEditMode = !!editId;

  const queryClient = useQueryClient();
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const { data: productsData } = useQuery({
    queryKey: ["sellerProducts", user?.id],
    queryFn: fetchSellerProducts,
    enabled: isEditMode,
  });

  const editingProduct = (productsData as any)?.products?.find(
    (p: any) => p.id === Number(editId)
  ) || (Array.isArray(productsData) ? (productsData as any[]).find((p) => p.id === Number(editId)) : null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { status: "موجود" },
  });

  const status = watch("status");

  useEffect(() => {
    if (editingProduct) {
      reset({
        name: editingProduct.name,
        price: Number(editingProduct.price),
        category: editingProduct.category || "",
        description: editingProduct.description || "",
        status: (["موجود", "فقط ۱ عدد", "ناموجود"].includes(editingProduct.status)
          ? editingProduct.status
          : "موجود") as any,
      });
      setImageUrl(editingProduct.image_url || "");
    }
  }, [editingProduct, reset]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setServerError("حجم عکس حداکثر ۵ مگابایت باشد");
      return;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    setServerError("");
  };

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    setServerError("");
    try {
      const payload: any = { ...data };
      if (imageFile) payload.image = imageFile;
      else if (imageUrl && !imageUrl.startsWith("blob:")) payload.image_url = imageUrl;

      if (isEditMode && editId) {
        await updateProduct(Number(editId), payload);
      } else {
        await createProduct(payload);
      }
      queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
      navigate("/seller");
    } catch (err: any) {
      setServerError(err.message || "ثبت نشد. اینترنت را چک کنید و دوباره بزنید.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28" dir="rtl">
      <PageHeader
        title={isEditMode ? "ویرایش کالا" : "کالای جدید"}
        subtitle="فقط چند مورد ساده را پر کنید"
      />

      <main className="px-4 py-5 max-w-lg mx-auto space-y-5">
        {!isEditMode && (
          <HintCard title="نکته برای فروش بیشتر" tone="amber">
            عکس واضح از خود کالا بگیرید. نام کوتاه و قیمت درست بنویسید. بعد از ثبت، ادمین تأیید می‌کند.
          </HintCard>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* عکس */}
          <div className="flex flex-col items-center">
            <label className="cursor-pointer relative w-36 h-36 rounded-3xl bg-white dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center overflow-hidden active:scale-[0.98] transition-transform">
              {imageUrl ? (
                <>
                  <img src={imageUrl} alt="پیش‌نمایش" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setImageUrl("");
                      setImageFile(null);
                    }}
                    className="absolute top-2 left-2 w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center text-white shadow"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center text-slate-400 gap-1">
                  <ImagePlus className="w-9 h-9" />
                  <span className="text-xs font-bold">لمس کنید · افزودن عکس</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <p className="text-[11px] text-slate-400 mt-2">عکس واضح = مشتری بیشتر</p>
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              نام کالا
            </label>
            <div className="relative">
              <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register("name")}
                placeholder="مثال: کفش ورزشی سایز ۴۲"
                className="w-full h-14 pr-10 pl-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base outline-none focus:border-indigo-500"
              />
            </div>
            {errors.name && (
              <p className="text-rose-500 text-xs mt-1.5 font-bold">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              قیمت (تومان)
            </label>
            <input
              {...register("price")}
              type="number"
              inputMode="numeric"
              placeholder="مثال: ۵۰۰۰۰۰"
              className="w-full h-14 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base outline-none focus:border-indigo-500"
            />
            {errors.price && (
              <p className="text-rose-500 text-xs mt-1.5 font-bold">{errors.price.message}</p>
            )}
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              دسته‌بندی (اختیاری)
            </label>
            <input
              {...register("category")}
              placeholder="مثال: پوشاک"
              className="w-full h-14 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              توضیح کوتاه (اختیاری)
            </label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="رنگ، سایز، وضعیت کالا..."
              className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base outline-none focus:border-indigo-500 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-slate-600 dark:text-slate-300 mb-2 block">
              وضعیت الان
            </label>
            <div className="grid grid-cols-3 gap-2">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setValue("status", s.value, { shouldValidate: true })}
                  className={`py-3 rounded-2xl border text-center transition-all ${
                    status === s.value
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                  }`}
                >
                  <span className="block text-xs font-black">{s.label}</span>
                  <span className={`block text-[10px] mt-0.5 ${status === s.value ? "text-indigo-100" : "text-slate-400"}`}>
                    {s.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {serverError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 text-sm p-3 rounded-2xl text-center font-bold">
              {serverError}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-gradient-to-l from-indigo-600 to-violet-600 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isEditMode ? (
              "ذخیره تغییرات"
            ) : (
              "ثبت کالا"
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
