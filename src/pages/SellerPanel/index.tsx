import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Loader2, Plus, Search, Share2, Eye, Users, Store, Pencil } from "lucide-react";
import SellerProductForm from "./ProductForm";
import { useSellerPanel } from "./hooks/useSellerPanel";
import { ProductItem } from "./components/ProductItem";
import { EditStoreSheet } from "./components/EditStoreSheet";
import { FilterType } from "./types";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "موجود", label: "موجود" },
  { id: "فقط ۱ عدد", label: "آخرین" },
  { id: "ناموجود", label: "ناموجود" },
];

export default function SellerPanel() {
  const [params] = useSearchParams();
  if (params.get("edit")) {
    return <SellerProductForm />;
  }
  return <SellerShopHome />;
}

function SellerShopHome() {
  const {
    user,
    toast,
    setToast,
    deletingId,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    productsLoading,
    storeInfo,
    storeLoading,
    editingStore,
    setEditingStore,
    followersData,
    viewsTotal,
    pendingCount,
    lowStockCount,
    filteredProducts,
    updateStatusMut,
    updateStoreMut,
    handleDeleteTrigger,
    handleShare,
    handleShareStore,
    cycleStatus,
  } = useSellerPanel();

  const shopName = storeInfo?.name || user?.store_name || user?.name || "مغازه من";
  const hasStore = !!storeInfo;

  return (
    <div className="px-4 py-5" dir="rtl">
      {toast && (
        <button
          type="button"
          onClick={() => setToast(null)}
          className="mb-3 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-white"
        >
          {toast}
        </button>
      )}

      <header className="mb-5">
        <p className="text-sm font-black text-[var(--accent)]">مغازه‌ام</p>
        <h1 className="mt-1 text-2xl font-black leading-snug">{shopName}</h1>
        <p className="mt-2 text-sm font-bold leading-7 text-[var(--ink-soft)]">
          کالا بگذار، ویترین را به اشتراک بگذار، موجودی را با یک لمس عوض کن.
        </p>
      </header>

      {storeLoading ? (
        <div className="mb-4 flex justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
        </div>
      ) : !hasStore ? (
        <div className="mb-4 rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-center">
          <Store className="mx-auto mb-2 h-8 w-8 text-amber-600" />
          <p className="font-black text-amber-900">فروشگاه هنوز کامل نیست</p>
          <p className="mt-1 text-sm font-bold leading-7 text-amber-800">
            نام و آدرس مغازه را بنویس تا مشتری‌ها پیدایت کنند.
          </p>
          <Link
            to="/complete-profile"
            className="mt-3 inline-flex h-12 items-center rounded-2xl bg-amber-500 px-5 text-sm font-black text-white"
          >
            تکمیل فروشگاه
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="presence-card rounded-2xl px-3 py-3 text-center">
              <Eye className="mx-auto mb-1 h-4 w-4 text-[var(--accent)]" />
              <p className="text-base font-black">{viewsTotal.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] font-bold text-[var(--muted)]">بازدید</p>
            </div>
            <div className="presence-card rounded-2xl px-3 py-3 text-center">
              <Users className="mx-auto mb-1 h-4 w-4 text-[var(--accent)]" />
              <p className="text-base font-black">{followersData.count.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] font-bold text-[var(--muted)]">دنبال‌کننده</p>
            </div>
            <div className="presence-card rounded-2xl px-3 py-3 text-center">
              <Store className="mx-auto mb-1 h-4 w-4 text-[var(--accent)]" />
              <p className="text-base font-black">{(storeInfo.total_products ?? filteredProducts.length).toLocaleString("fa-IR")}</p>
              <p className="text-[10px] font-bold text-[var(--muted)]">کالا</p>
            </div>
          </div>
          {pendingCount > 0 && (
            <p className="mb-3 text-center text-xs font-bold text-amber-700">
              {pendingCount.toLocaleString("fa-IR")} کالا منتظر تأیید است
            </p>
          )}
          <div className="mb-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleShareStore}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white text-sm font-black"
            >
              <Share2 className="h-4 w-4" /> اشتراک ویترین
            </button>
            <button
              type="button"
              onClick={() => setEditingStore(true)}
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-white text-sm font-black"
            >
              <Pencil className="h-4 w-4" /> ویرایش فروشگاه
            </button>
            <Link
              to={`/store/${storeInfo.id}`}
              className="col-span-2 flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[var(--paper)] text-sm font-black"
            >
              <Eye className="h-4 w-4" /> دیدن ویترین عمومی
            </Link>
          </div>
        </>
      )}

      <Link
        to="/add-product"
        className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] text-base font-black text-white shadow-lg shadow-[var(--accent)]/25"
      >
        <Plus className="h-5 w-5" /> کالای جدید بذار
      </Link>

      {lowStockCount > 0 && (
        <p className="mt-3 text-center text-xs font-bold text-amber-700">
          {lowStockCount.toLocaleString("fa-IR")} کالا موجودی‌اش کم است
        </p>
      )}

      <label className="mt-5 flex min-h-12 items-center gap-3 rounded-2xl border border-[var(--line)] bg-white px-4">
        <Search className="h-4 w-4 text-[var(--muted)]" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="اسم کالا را پیدا کن"
          className="h-12 flex-1 bg-transparent text-sm font-bold outline-none"
        />
      </label>

      <div className="mt-3 flex gap-2 overflow-x-auto presence-hide-scroll pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatusFilter(f.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-black ${
              statusFilter === f.id ? "bg-[var(--accent)] text-white" : "presence-chip"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {productsLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="presence-card rounded-[28px] p-8 text-center">
            <p className="font-black">هنوز کالایی اینجا نیست</p>
            <p className="mt-2 text-sm font-bold leading-7 text-[var(--muted)]">
              یک عکس، اسم و قیمت کافی است. بعد مشتری از محله پیدایت می‌کند.
            </p>
            <Link
              to="/add-product"
              className="mt-4 inline-flex h-12 items-center rounded-2xl bg-[var(--accent)] px-5 text-sm font-black text-white"
            >
              اولین کالا را بگذار
            </Link>
          </div>
        ) : (
          <AnimatePresence>
            {filteredProducts.map((product) => (
              <ProductItem
                key={product.id}
                product={product}
                isUpdating={updateStatusMut.isPending && updateStatusMut.variables?.id === product.id}
                isDeleting={deletingId === product.id}
                onStatusChange={cycleStatus}
                onDelete={handleDeleteTrigger}
                onShare={handleShare}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      <EditStoreSheet
        isOpen={editingStore}
        onClose={() => setEditingStore(false)}
        defaultValues={{
          name: storeInfo?.name || "",
          phone: storeInfo?.phone || user?.phone || "",
          category: storeInfo?.category || "",
          description: storeInfo?.description || "",
          province: storeInfo?.province || "",
          city: storeInfo?.city || "",
          address: storeInfo?.address || "",
        }}
        onSave={(values) => updateStoreMut.mutate(values)}
        isPending={updateStoreMut.isPending}
      />
    </div>
  );
}
