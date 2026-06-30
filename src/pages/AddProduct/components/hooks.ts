import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { compressImage } from "../../../utils/imageCompression";
import { apiRequest } from "../../../utils/api";

export function useAddProduct(user: any) {
  const navigate = useNavigate();

  // ── Refs ──
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── Form States ──
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState(() => localStorage.getItem("lastCategory") || "");
  const [status, setStatus] = useState<"موجود" | "ناموجود">("موجود");
  const [badge, setBadge] = useState<string | null>(null);
  
  // ── Inventory State ──
  const [inventory, setInventory] = useState<Record<string, number>>({});
  const [loadingInventory, setLoadingInventory] = useState(true);

  // ── File States ──
  const [preview, setPreview] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);

  // ── Action States ──
  const [genDesc, setGenDesc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type?: "error" | "success"; id: number } | null>(null);

  // ── Toast Handler ──
  const showToast = useCallback((msg: string, type: "error" | "success" = "error") => {
    if (navigator.vibrate) navigator.vibrate(type === 'error' ? [50, 50, 50] : 50);
    const id = Date.now();
    setToast({ msg, type, id });
    
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Fetch Inventory ──
  useEffect(() => {
    let isMounted = true;
    
    const fetchInventory = async () => {
      setLoadingInventory(true);
      try {
        const data = await apiRequest<{ success: boolean; inventory: Record<string, number> }>(
          "/api/user/badges/inventory", 
          { auth: true }
        );
        
        if (isMounted && data.success && data.inventory) {
          setInventory(data.inventory);
        }
      } catch (error) {
        console.error("Failed to fetch badge inventory", error);
      } finally {
        if (isMounted) setLoadingInventory(false);
      }
    };
    
    if (user) fetchInventory();
    
    return () => { 
      isMounted = false; 
    };
  }, [user]);

  // ── Handlers ──

  const handleImage = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      return showToast("حجم تصویر نباید بیشتر از ۱۰ مگابایت باشد.");
    }
    
    setCompressing(true);
    try {
      const b64 = await compressImage(file, { 
        maxWidth: 1000, 
        maxHeight: 1000, 
        quality: 0.8, 
        outputType: "base64", 
        fillWhiteBackground: true 
      }) as string;
      
      setPreview(b64);
    } catch { 
      showToast("خطا در بهینه‌سازی تصویر"); 
    } finally { 
      setCompressing(false); 
    }
  }, [showToast]);

  const removeImage = () => { 
    setPreview(null); 
    if (fileRef.current) fileRef.current.value = ""; 
    if (cameraRef.current) cameraRef.current.value = ""; 
  };

  const generateDesc = async () => {
    // 🔴 تغییر به کالا
    if (!name.trim()) return showToast("ابتدا نام کالا را وارد کنید.");
    
    setGenDesc(true);
    try {
      const data = await apiRequest<{ success: boolean; data?: { description: string } }>(
        "/api/ai/generate-description", 
        { 
          method: "POST", 
          body: { name, category } 
        }
      );
      
      if (data.success && data.data?.description) {
        setDesc(data.data.description); 
      } else {
        showToast("تولید توضیحات ناموفق بود.");
      }
    } catch { 
      showToast("خطا در ارتباط با هوش مصنوعی."); 
    } finally { 
      setGenDesc(false); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔴 تغییر به کالا
    if (!name.trim() || name.trim().length < 3) {
      return showToast("نام کالا باید حداقل ۳ حرف باشد.");
    }
    if (!category) {
      return showToast("دسته‌بندی را مشخص کنید.");
    }
    
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        price: price ? price.replace(/,/g, "") : "",
        description: desc.trim(),
        category,
        status,
        image: preview,
        badge
      };

      const data = await apiRequest<{ success: boolean; error?: string }>(
        "/api/products", 
        {
          method: "POST", 
          auth: true,
          body: payload,
        }
      );
      
      if (data.success) {
        localStorage.setItem("lastCategory", category);
        // 🔴 تغییر به کالا
        navigate("/seller", { state: { successMsg: "کالا با موفقیت ثبت شد!" } });
      } else {
        // 🔴 تغییر به کالا
        showToast(data.error || "خطا در ثبت کالا");
      }
    } catch { 
      showToast("خطا در برقراری ارتباط با سرور"); 
    } finally { 
      setSubmitting(false); 
    }
  };

  return {
    refs: { fileRef, cameraRef },
    state: { 
      name, price, desc, category, status, badge, inventory, 
      loadingInventory, preview, compressing, genDesc, submitting, toast 
    },
    setters: { setName, setPrice, setDesc, setCategory, setStatus, setBadge },
    actions: { handleImage, removeImage, generateDesc, handleSubmit }
  };
}