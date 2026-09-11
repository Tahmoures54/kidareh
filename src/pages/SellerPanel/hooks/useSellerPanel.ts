import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { FilterType, Product, ProductStatus, StoreFormValues, StoreInfo } from "../types";
import { fetchSellerProducts, updateProduct, deleteProduct } from "../../../services/products.service";
import { apiRequest, ApiError } from "../../../utils/api";

const STATUS_FLOW: Record<ProductStatus, ProductStatus> = {
  موجود: "فقط ۱ عدد",
  "فقط ۱ عدد": "ناموجود",
  ناموجود: "موجود",
};

export function normalizeStatus(status: string | undefined): ProductStatus {
  if (status === "فقط ۳ عدد" || status === "موجودی کم") return "فقط ۱ عدد";
  if (status === "موجود" || status === "فقط ۱ عدد" || status === "ناموجود") {
    return status;
  }
  return "موجود";
}

export function nextStatus(status: string | undefined): ProductStatus {
  return STATUS_FLOW[normalizeStatus(status)];
}

function normalizeProduct(raw: Record<string, unknown>): Product {
  const status = normalizeStatus(typeof raw.status === "string" ? raw.status : undefined);
  const image = (typeof raw.image_url === "string" && raw.image_url) || (typeof raw.image === "string" && raw.image) || null;
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    price: Number(raw.price ?? 0),
    status,
    views: Number(raw.views ?? 0),
    isPublic: status !== "ناموجود",
    badge: typeof raw.badge === "string" ? raw.badge : null,
    image,
    image_url: image,
  };
}

export function useSellerPanel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const [toast, setToast] = useState<string | null>(null);
  const [editingStore, setEditingStore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterType>("all");

  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "مغازه‌ام | کی‌داره";
  }, []);

  useEffect(() => {
    const msg = (location.state as { successMsg?: string } | null)?.successMsg;
    if (!msg) return;
    setToast(msg);
    navigate(".", { replace: true, state: {} });
  }, [location.state, navigate]);

  const handleShowToast = useCallback((msg: string) => {
    if (navigator.vibrate) navigator.vibrate(40);
    setToast(msg);
  }, []);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["sellerProducts", user?.id],
    queryFn: ({ signal }) => fetchSellerProducts(signal),
    enabled: !!user,
  });

  const { data: storeInfo, isLoading: storeLoading } = useQuery({
    queryKey: ["myStore", user?.id],
    queryFn: async () => {
      try {
        return await apiRequest<StoreInfo>("/api/stores/my/store", { auth: true });
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) return null;
        throw err;
      }
    },
    enabled: !!user,
  });

  const { data: statsData } = useQuery({
    queryKey: ["myStoreStats", user?.id],
    queryFn: () =>
      apiRequest<{
        store_id: number;
        follower_count: number;
        product_count: number;
        total_views: number;
        pending_count: number;
      }>("/api/stores/my/stats", { auth: true }),
    enabled: !!user && !!storeInfo,
  });

  const products = useMemo<Product[]>(() => {
    const list = productsData?.products ?? [];
    return list.map((item) => normalizeProduct(item as unknown as Record<string, unknown>));
  }, [productsData]);

  const followersData = { count: Number(statsData?.follower_count ?? storeInfo?.follower_count ?? 0) };
  const viewsTotal = Number(statsData?.total_views ?? storeInfo?.total_views ?? products.reduce((sum, p) => sum + p.views, 0));

  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
    queryClient.invalidateQueries({ queryKey: ["myStoreStats"] });
  }, [queryClient]);

  const updateStatusMut = useMutation({
    mutationFn: (vars: { id: number; status: ProductStatus }) => updateProduct(vars.id, { status: vars.status }),
    onSuccess: () => {
      handleShowToast("وضعیت عوض شد");
      invalidateProducts();
    },
    onError: () => handleShowToast("وضعیت عوض نشد. دوباره بزن"),
  });

  const toggleVisibilityMut = useMutation({
    mutationFn: (vars: { id: number; isPublic: boolean }) =>
      updateProduct(vars.id, { status: vars.isPublic ? "موجود" : "ناموجود" }),
    onSuccess: () => {
      handleShowToast("نمایش تغییر کرد");
      invalidateProducts();
    },
  });

  const deleteProductMut = useMutation({
    mutationFn: (id: number) => deleteProduct(id),
    onSuccess: () => {
      handleShowToast("کالا حذف شد");
      setDeletingId(null);
      invalidateProducts();
    },
  });

  const updateStoreMut = useMutation({
    mutationFn: (values: StoreFormValues) =>
      apiRequest("/api/stores/my/store", { method: "PUT", auth: true, body: values }),
    onSuccess: () => {
      setEditingStore(false);
      handleShowToast("اطلاعات فروشگاه به‌روز شد");
      queryClient.invalidateQueries({ queryKey: ["myStore"] });
    },
    onError: () => handleShowToast("فروشگاه ذخیره نشد. دوباره بزن"),
  });

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
    async (product: Product) => {
      const url = `${window.location.origin}/products/${product.id}`;
      if (navigator.share) {
        await navigator.share({ title: product.name, url });
      } else {
        await navigator.clipboard.writeText(url);
        handleShowToast("لینک کپی شد");
      }
    },
    [handleShowToast]
  );

  const handleShareStore = useCallback(async () => {
    if (!storeInfo?.id) {
      handleShowToast("اول فروشگاه را کامل کن");
      return;
    }
    const url = `${window.location.origin}/store/${storeInfo.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: storeInfo.name, text: `ویترین ${storeInfo.name} در کی‌داره`, url });
      } else {
        await navigator.clipboard.writeText(url);
        handleShowToast("لینک ویترین کپی شد");
      }
    } catch {
      /* cancelled */
    }
  }, [storeInfo, handleShowToast]);

  const handleLogout = useCallback(async () => {
    await logout();
    navigate("/login");
  }, [logout, navigate]);

  const cycleStatus = useCallback(
    (product: Product) => {
      updateStatusMut.mutate({ id: product.id, status: nextStatus(product.status) });
    },
    [updateStatusMut]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.status === "فقط ۱ عدد").length,
    [products]
  );

  const filteredProducts = useMemo(
    () =>
      products.filter((p) => {
        const matchQ = !searchQuery || p.name.includes(searchQuery);
        const matchS = statusFilter === "all" || p.status === statusFilter;
        return matchQ && matchS;
      }),
    [products, searchQuery, statusFilter]
  );

  return {
    user,
    toast,
    setToast,
    editingStore,
    setEditingStore,
    deletingId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    products,
    productsLoading,
    storeInfo,
    storeLoading,
    followersData,
    viewsTotal,
    pendingCount: Number(statsData?.pending_count ?? 0),
    lowStockCount,
    filteredProducts,
    updateStatusMut,
    toggleVisibilityMut,
    deleteProductMut,
    updateStoreMut,
    handleShowToast,
    handleDeleteTrigger,
    handleShare,
    handleShareStore,
    handleLogout,
    cycleStatus,
    statusFlow: STATUS_FLOW,
  };
}
