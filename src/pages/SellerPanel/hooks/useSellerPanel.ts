import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { ChartPeriod, FilterType, ProductStatus, StoreFormValues } from "../types";
import { 
  fetchSellerProducts, 
  updateProduct, 
  deleteProduct,
  CreateProductPayload 
} from "../../../services/products.service";

const STATUS_FLOW: Record<ProductStatus, ProductStatus> = {
  موجود: "موجودی کم",
  "موجودی کم": "فقط ۳ عدد",
  "فقط ۳ عدد": "ناموجود",
  ناموجود: "موجود",
};

export function useSellerPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("weekly");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterType>("all");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "پنل فروشنده | کی‌داره";
  }, []);

  const handleShowToast = useCallback((msg: string) => {
    if (navigator.vibrate) navigator.vibrate(40);
    setToast(msg);
  }, []);

  // --- Data Fetching (React Query) ---
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["sellerProducts", user?.id],
    queryFn: fetchSellerProducts,
    enabled: !!user,
  });

  const products = useMemo(() => productsData?.products || [], [productsData]);

  // TODO: این هوک‌ها نیز باید به React Query متصل شوند (فعلاً روی مقادیر پیش‌فرض می‌مانند)
  const storeInfo = null; // useQuery برای اطلاعات فروشگاه
  const storeLoading = false;
  const chartData: any[] = []; // useQuery برای آمار
  const contactsData = { count: 0 };
  const followersData = { count: 0 };

  // --- Mutations ---
  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
  }, [queryClient]);

  const updateStatusMut = useMutation({
    mutationFn: (vars: { id: number; status: ProductStatus }) => 
      updateProduct(vars.id, { status: vars.status }),
    onSuccess: () => {
      handleShowToast("وضعیت بروز شد");
      invalidateProducts();
    },
    onError: () => handleShowToast("خطا در تغییر وضعیت")
  });

  const toggleVisibilityMut = useMutation({
    mutationFn: (vars: { id: number; isPublic: boolean }) => 
      updateProduct(vars.id, { status: vars.isPublic ? "موجود" : "ناموجود" }), // فرض بر این که عمومی/خصوصی با وضعیت مدیریت می‌شود
    onSuccess: () => {
      handleShowToast("نمایش تغییر کرد");
      invalidateProducts();
    }
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      handleShowToast("کالا برای همیشه حذف شد");
      setDeletingId(null);
      invalidateProducts();
    }
  });

  const updateStoreMut = useMutation({
    mutationFn: async (values: StoreFormValues) => {
      // await updateStoreInfo(values); -> سرویس مربوطه فراخوانی شود
      return new Promise(res => setTimeout(res, 500)); // شبیه‌سازی موقت
    },
    onSuccess: () => {
      setEditingStore(false);
      handleShowToast("اطلاعات فروشگاه به‌روز شد");
    }
  });

  // --- Handlers ---
  const handleDeleteTrigger = useCallback(
    (id: number) => {
      if (deletingId !== id) {
        if (navigator.vibrate) navigator.vibrate(40);
        setDeletingId(id);
        setTimeout(() => setDeletingId(null), 3000);
        return;
      }
      deleteProductMut.mutate(id);
    },
    [deletingId, deleteProductMut]
  );

  const handleShare = useCallback(
    async (product: any) => {
      const url = `${window.location.origin}/product/${product.id}`;
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        handleShowToast("لینک کپی شد");
      }
    },
    [handleShowToast]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  // --- Derived data ---
  const totalViews = useMemo(() => products.reduce((a, p) => a + (p.views || 0), 0), [products]);
  const lowStockCount = useMemo(
    () => products.filter((p) => p.status === "موجودی کم" || p.status === "فقط ۳ عدد").length,
    [products]
  );
  const hasBlueTick = false; // از storeInfo محاسبه شود

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchQ = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchS = statusFilter === "all" || p.status === statusFilter;
        return matchQ && matchS;
      }),
    [products, searchQuery, statusFilter]
  );

  return {
    user, toast, setToast, editingStore, setEditingStore, deletingId,
    chartPeriod, setChartPeriod, searchQuery, setSearchQuery, statusFilter, setStatusFilter,
    products, productsLoading, storeInfo, storeLoading, chartData, contactsData, followersData,
    totalViews, lowStockCount, hasBlueTick, filteredProducts,
    updateStatusMut, toggleVisibilityMut, deleteProductMut, updateStoreMut,
    handleShowToast, handleDeleteTrigger, handleShare, handleLogout, statusFlow: STATUS_FLOW,
  };
}