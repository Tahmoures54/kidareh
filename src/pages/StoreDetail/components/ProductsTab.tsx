import React, { memo } from "react";
import { Package } from "lucide-react";
import { Product, StoreData } from "../types";
import { FeedStack } from "../../../components/feed/FeedColumn";
import { FeedPost } from "../../../components/feed/FeedPost";
import { productToFeedPost } from "../../../lib/feedMappers";
import { isProductAvailable } from "../../../utils/productAvailability";

export const ProductsTab = memo(({
  products,
  store,
}: {
  products: Product[];
  store: StoreData;
}) => {
  if (products.length === 0) return (
    <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-light)]">
      <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
      <p className="text-sm font-bold text-[var(--text-muted)]">فروشگاه هنوز کالایی ثبت نکرده است</p>
    </div>
  );

  const availableCount = products.filter((product) => isProductAvailable(product.status)).length;
  const orderedProducts = [...products].sort((a, b) => {
    const availableDiff = Number(isProductAvailable(b.status)) - Number(isProductAvailable(a.status));
    if (availableDiff !== 0) return availableDiff;
    const badgeDiff = Number(Boolean(b.badge)) - Number(Boolean(a.badge));
    if (badgeDiff !== 0) return badgeDiff;
    return Number(b.id) - Number(a.id);
  });

  return (
    <div className="-mx-5 bg-white">
      <div className="mx-5 mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-secondary)] px-4 py-3" aria-label="خلاصه موجودی فروشگاه">
        <div className="min-w-0">
          <p className="text-sm font-black text-[var(--text-primary)]">ویترین فروشگاه</p>
          <p className="mt-0.5 text-[11px] font-bold text-[var(--text-muted)]">{products.length.toLocaleString("fa-IR")} کالا ثبت شده</p>
        </div>
        <span className="shrink-0 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700">
          {availableCount.toLocaleString("fa-IR")} کالا موجود
        </span>
      </div>
      <FeedStack>
        {orderedProducts.map((product) => (
          <FeedPost
            key={product.id}
            post={productToFeedPost(product, {
              id: store.id,
              name: store.name,
              image: store.image,
              verified: store.verified,
            })}
          />
        ))}
      </FeedStack>
    </div>
  );
});
