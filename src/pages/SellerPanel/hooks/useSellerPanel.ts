import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AuthContext";
import { FilterType, Product, ProductStatus, StoreFormValues } from "../types";
import { fetchSellerProducts, updateProduct, deleteProduct } from "../../../services/products.service";

const STATUS_FLOW: Record<ProductStatus, ProductStatus> = {
  موجود: "موجودی کم",
  "موجودی کم": "فقط ۱ عدد",
  "فقط ۱ عدد": "ناموجود",
  ناموجود: "موجود",
};

export function normalizeStatus(status: string | undefined): ProductStatus {
  if (status === "فقط ۳ عدد") return "فقط ۱ عدد";
  if (status === "موجود" || status === "موجودی کم" || status === "فقط ۱ عدد" || status === "ناموجود") {
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

  const handleShowToast = useCallback((msg: string) => {
    if (navigator.vibrate) navigator.vibrate(40);
    setToast(msg);
  }, []);

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ["sellerProducts", user?.id],
    queryFn: ({ signal }) => fetchSellerProducts(signal),
    enabled: !!user,
  });

  const products = useMemo<Product[]>(() => {
    const list = productsData?.products ?? [];
    return list.map((item) => normalizeProduct(item as unknown as Record<string, unknown>));
  }, [productsData]);

  const storeInfo = null;
  const storeLoading = false;
  const chartData: unknown[] = [];
  const contactsData = { count: 0 };
  const followersData = { count: 0 };

  const invalidateProducts = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["sellerProducts"] });
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
    mutationFn: async (_values: StoreFormValues) => new Promise((res) => setTimeout(res, 500)),
    onSuccess: () => {
      setEditingStore(false);
      handleShowToast("اطلاعات فروشگاه به‌روز شد");
    },
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

  const cycleStatus = useCallback(
    (product: Product) => {
      updateStatusMut.mutate({ id: product.id, status: nextStatus(product.status) });
    },
    [updateStatusMut]
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.status === "موجودی کم" || p.status === "فقط ۱ عدد").length,
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
    chartData,
    contactsData,
    followersData,
    lowStockCount,
    filteredProducts,
    updateStatusMut,
    toggleVisibilityMut,
    deleteProductMut,
    updateStoreMut,
    handleShowToast,
    handleDeleteTrigger,
    handleShare,
    handleLogout,
    cycleStatus,
    statusFlow: STATUS_FLOW,
  };
}
