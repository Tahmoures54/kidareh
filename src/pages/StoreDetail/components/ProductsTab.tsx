import React, { memo } from "react";
import { Package } from "lucide-react";
import { Product, StoreData } from "../types";
import { FeedStack } from "../../../components/feed/FeedColumn";
import { FeedPost } from "../../../components/feed/FeedPost";
import { productToFeedPost } from "../../../lib/feedMappers";

export const ProductsTab = memo(({
  products,
  store,
}: {
  products: Product[];
  onProductClick?: (id: number) => void;
  store: StoreData;
}) => {
  if (products.length === 0) return (
    <div className="text-center py-16 bg-[var(--bg-secondary)] rounded-3xl border border-dashed border-[var(--border-light)]">
      <Package className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
      <p className="text-sm font-bold text-[var(--text-muted)]">فروشگاه هنوز کالایی ثبت نکرده است</p>
    </div>
  );

  return (
    <div className="-mx-5 bg-white">
      <FeedStack>
        {products.map((product) => (
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
