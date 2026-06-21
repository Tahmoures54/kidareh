import { useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { Loader2, AlertCircle } from 'lucide-react';
import ProductCard from './ProductCard';
import ProductSkeleton from './ProductSkeleton';
import type { Product } from '../../hooks/useInfiniteProducts';

interface VirtualProductGridProps {
  products: Product[];
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => void;
  error: Error | null;
  onRetry: () => void;
}

export default function VirtualProductGrid({
  products,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  fetchNextPage,
  error,
  onRetry
}: VirtualProductGridProps) {
  const virtuosoRef = useRef<any>(null);

  //  »œÌ· ¬—«ÌÂ  òù»⁄œÌ »Â grid œÊ «ÌÌ
  const gridProducts = products.reduce<Product[][]>((acc, product, index) => {
    if (index % 2 === 0) {
      acc.push([product]);
    } else {
      acc[acc.length - 1].push(product);
    }
    return acc;
  }, []);

  const loadMore = useCallback(() => {
    if (!isFetchingNextPage && hasNextPage) {
      fetchNextPage();
    }
  }, [isFetchingNextPage, hasNextPage, fetchNextPage]);

  // Initial Loading
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <ProductSkeleton key={i} />
        ))}
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-xl p-8 text-center">
        <AlertCircle className="w-14 h-14 mx-auto mb-4 text-red-400" />
        <h4 className="font-bold text-red-700 mb-2 text-lg">Œÿ« œ— »«—ê–«—Ì</h4>
        <p className="text-sm text-red-600 mb-5">
          {error.message || "„ √”›«‰Â ‰ Ê«‰” Ì„ „Õ’Ê·«  —« œ—Ì«›  ò‰Ì„"}
        </p>
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition-colors active:scale-95"
        >
           ·«‘ „Ãœœ
        </button>
      </div>
    );
  }

  // Empty State
  if (!isLoading && products.length === 0) {
    return (
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-10 rounded-2xl text-center border border-gray-200">
        <div className="w-20 h-20 mx-auto mb-5 text-gray-300">
          <svg fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
          </svg>
        </div>
        <h4 className="font-bold text-gray-800 mb-2 text-lg">„Õ’Ê·Ì Ì«›  ‰‘œ</h4>
        <p className="text-sm text-gray-500">
          Â‰Ê“ „Õ’Ê·Ì œ— «Ì‰ »Œ‘ À»  ‰‘œÂ «” 
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <Virtuoso
        ref={virtuosoRef}
        data={gridProducts}
        useWindowScroll
        overscan={400}
        endReached={loadMore}
        itemContent={(index, row) => (
          <div className="grid grid-cols-2 gap-4 mb-4" key={`row-${index}`}>
            {row.map((product, colIndex) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index * 2 + colIndex}
              />
            ))}
          </div>
        )}
        components={{
          Footer: () => {
            if (isFetchingNextPage) {
              return (
                <div className="flex justify-center items-center py-8">
                  <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-full shadow-lg border border-gray-100">
                    <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
                    <span className="text-sm font-medium text-gray-700">
                      œ— Õ«· »«—ê–«—Ì...
                    </span>
                  </div>
                </div>
              );
            }

            if (!hasNextPage && products.length > 0) {
              return (
                <div className="text-center py-8 text-sm text-gray-500">
                  <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
                    <span>?</span>
                    <span>Â„Â „Õ’Ê·«  ‰„«Ì‘ œ«œÂ ‘œ</span>
                  </div>
                </div>
              );
            }

            return null;
          }
        }}
      />
    </div>
  );
}