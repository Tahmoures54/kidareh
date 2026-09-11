import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "motion/react";
import { Loader2, Plus, Search } from "lucide-react";
import SellerProductForm from "./ProductForm";
import { useSellerPanel } from "./hooks/useSellerPanel";
import { ProductItem } from "./components/ProductItem";
import { FilterType } from "./types";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all", label: "همه" },
  { id: "موجود", label: "موجود" },
  { id: "موجودی کم", label: "کم" },
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
    lowStockCount,
    filteredProducts,
    updateStatusMut,
    handleDeleteTrigger,
    handleShare,
    cycleStatus,
  } = useSellerPanel();

  const shopName = user?.store_name || user?.name || "مغازه من";

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
          کالا بگذار، موجودی را با یک لمس عوض کن. سخت نیست.
        </p>
      </header>

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
    </div>
  );
}
