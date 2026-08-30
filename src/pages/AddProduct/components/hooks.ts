import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { compressImage } from "../../../utils/imageCompression";
import { apiRequest, ApiError } from "../../../utils/api";
import { getProductCategoryFromStoreCategory } from "../../../utils/categoryMapping";
import { friendlyError } from "../../../utils/friendlyError";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(header)?.[1] || "image/jpeg";
  const binary = atob(data);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function useAddProduct(user: any) {
  const navigate = useNavigate();

  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rawFileRef = useRef<File | null>(null);

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(() => {
    const autoAssigned = getProductCategoryFromStoreCategory(user?.store_category);
    return autoAssigned !== "General" ? autoAssigned : localStorage.getItem("lastCategory") || "";
  });
  const [status, setStatus] = useState<"موجود" | "ناموجود" | "فقط ۱ عدد" | "به‌زودی">("موجود");
  const [badge, setBadge] = useState<string | null>(null);

  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loadingInventory, setLoadingInventory] = useState(true);

  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  const [genDesc, setGenDesc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "error" | "success"; id: number } | null>(null);

  const showToast = useCallback((msg: string, type: "error" | "success" = "error") => {
    if (navigator.vibrate) navigator.vibrate(type === "error" ? [50, 50, 50] : 50);
    const id = Date.now();
    setToast({ msg, type, id });
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => {
    if (user?.store_category) {
      const autoAssigned = getProductCategoryFromStoreCategory(user.store_category);
      if (autoAssigned && autoAssigned !== "General") setCategory(autoAssigned);
    }
  }, [user?.store_category]);

  useEffect(() => {
    let isMounted = true;
    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const data = await apiRequest<{ success: boolean; inventory: Record<string, number> }>(
          "/api/user/badges/inventory",
          { auth: true }
        );
        if (isMounted && data.success && data.inventory) setInventory(data.inventory);
      } catch {
        // اختیاری — بدون برچسب هم می‌شود کالا ثبت کرد
      } finally {
        if (isMounted) setLoadingInventory(false);
      }
    };
    if (user) fetchInventory();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleImage = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) return showToast("عکس خیلی بزرگه. تا ۱۰ مگابایت باشه.");

      setCompressing(true);
      try {
        rawFileRef.current = file;
        const b64 = (await compressImage(file, {
          maxWidth: 1000,
          maxHeight: 1000,
          quality: 0.8,
          outputType: "base64",
          fillWhiteBackground: true,
        })) as string;
        setPreview(b64);
      } catch {
        showToast("با این عکس مشکل پیش اومد. یکی دیگه امتحان کن.");
      } finally {
        setCompressing(false);
      }
    },
    [showToast]
  );

  const removeImage = () => {
    setPreview(null);
    rawFileRef.current = null;
    if (fileRef.current) fileRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

  const generateDesc = async () => {
    if (!name.trim()) return showToast("اول اسم کالا رو بنویس.");
    setGenDesc(true);
    try {
      const data = await apiRequest<{ success: boolean; data?: { description: string } }>("/api/ai/generate-description", {
        method: "POST",
        body: { name, category },
      });
      if (data.success && data.data?.description) setDesc(data.data.description);
      else showToast("الان توضیحات ساخته نشد. خودت بنویس یا بعداً دوباره بزن.");
    } catch (err) {
      showToast(friendlyError(err, "الان هوش مصنوعی جواب نداد. خودت چند خط بنویس."));
    } finally {
      setGenDesc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || name.trim().length < 3) {
      return showToast("اسم کالا حداقل ۳ حرف باشه.");
    }

    const finalCategory = category || "General";

    setSubmitting(true);
    try {
      const form = new FormData();
      form.append("name", name.trim());
      form.append("price", price ? price.replace(/,/g, "") : "0");
      form.append("description", desc.trim());
      form.append("category", finalCategory);
      form.append("status", status);
      if (badge) form.append("badge", badge);

      if (preview) {
        const blob = rawFileRef.current || dataUrlToBlob(preview);
        form.append("image", blob, "product.jpg");
      }

      // multipart بدون Content-Type دستی — مرورگر boundary می‌گذارد
      const base = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, "") || window.location.origin;
      const url = `${base}/api/products`.replace(/([^:]\/)\/+/g, "$1");

      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: form,
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new ApiError(data?.error || `خطا (${res.status})`, res.status, data);
      }

      if (data?.success) {
        localStorage.setItem("lastCategory", finalCategory);
        navigate("/seller", {
          state: {
            successMsg: "کالایت ثبت شد ✅ بعد از بررسی کوتاه، روی سایت دیده می‌شه.",
          },
        });
      } else {
        showToast(friendlyError(data?.error, "ثبت کالا انجام نشد. دوباره امتحان کن."));
      }
    } catch (err) {
      showToast(friendlyError(err, "ثبت کالا انجام نشد. اینترنت رو چک کن و دوباره بزن."));
    } finally {
      setSubmitting(false);
    }
  };

  return {
    refs: { fileRef, cameraRef },
    state: {
      name,
      price,
      desc,
      category,
      status,
      badge,
      inventory,
      loadingInventory,
      preview,
      compressing,
      genDesc,
      submitting,
      toast,
    },
    setters: { setName, setPrice, setDesc, setCategory, setStatus, setBadge },
    actions: { handleImage, removeImage, generateDesc, handleSubmit },
  };
}
