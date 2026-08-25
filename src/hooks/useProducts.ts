import { useState, useEffect } from 'react';

export interface Product {
  id: number;
  name: string;
  price: string | number;
  status: string;
  badge?: string;
  image_url?: string;
  store_name?: string;
  city?: string;
  province?: string;
  category?: string;
  description?: string;
  views?: number;
  created_at?: string;
}

interface UseProductsOptions {
  scope: "city" | "province" | "all";
  city: string;
  enabled?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: boolean;
  refetch: () => void;
}

export function useProducts({ scope, city, enabled = true }: UseProductsOptions): UseProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    let isMounted = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await fetch(
          `/api/products?scope=${scope}&city=${encodeURIComponent(city)}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        const productsList = Array.isArray(data) ? data : (data.products || data.data || []);
        
        if (isMounted) {
          setProducts(productsList);
          setError(false);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError' && isMounted) {
          console.error("Products fetch error:", err);
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    // Debounce
    const timeoutId = setTimeout(fetchProducts, 300);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [scope, city, retryCount, enabled]);

  const refetch = () => setRetryCount(c => c + 1);

  return { products, loading, error, refetch };
}