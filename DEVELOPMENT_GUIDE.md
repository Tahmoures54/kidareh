# 📚 کی‌داره - راهنمای توسعه Modern (مستوی Instagram)

## 🎯 معماری و Best Practices

### 1. **Performance Optimization** ⚡

#### Image Optimization
```typescript
import { getOptimizedImageSrc, useIntersectionObserver } from '@utils/performance';

function ImageComponent({ src }) {
  const { ref, isVisible } = useIntersectionObserver();
  
  return (
    <img
      ref={ref}
      src={isVisible ? getOptimizedImageSrc(src, 400) : undefined}
      loading="lazy"
      alt="Product"
    />
  );
}
```

#### Metrics Tracking
```typescript
import { trackWebVitals } from '@utils/performance';

trackWebVitals((metric) => {
  console.log(`${metric.name}: ${metric.value}ms (${metric.rating})`);
});
```

### 2. **Security** 🔒

#### Input Sanitization
```typescript
import { sanitizeInput, isValidEmail } from '@utils/security';

const userInput = sanitizeInput(user.name);
const isValidEmail = isValidEmail(email);
```

#### Token Management
```typescript
import { SecureTokenManager } from '@utils/security';

// Set token
SecureTokenManager.setToken(token, 3600000); // 1 hour expiry

// Get token
const token = SecureTokenManager.getToken(); // Auto checks expiry

// Clear on logout
SecureTokenManager.clearToken();
```

### 3. **Error Handling** 🛡️

#### Global Error Boundary
```typescript
import { GlobalErrorBoundary } from '@components/ui/GlobalErrorBoundary';

function App() {
  return (
    <GlobalErrorBoundary>
      <YourApp />
    </GlobalErrorBoundary>
  );
}
```

#### Error Logging
```typescript
import { errorLogger } from '@utils/analytics';

try {
  // Your code
} catch (error) {
  errorLogger.logError('Operation failed', error as Error, {
    userId: user.id,
    action: 'fetchProducts'
  });
}
```

### 4. **Analytics & Monitoring** 📊

#### Event Tracking
```typescript
import { analytics } from '@utils/analytics';

function handleProductClick(productId: string) {
  analytics.trackEvent({
    name: 'product_click',
    category: 'engagement',
    label: 'product_list',
    value: productId,
    metadata: { price: 10000 }
  });
}
```

### 5. **Advanced Hooks** 🎣

#### useAsync for Data Fetching
```typescript
import { useAsync } from '@hooks/useAdvanced';

function ProductList() {
  const { status, data, error, execute } = useAsync(
    () => fetchProducts(),
    true // immediate
  );

  if (status === 'pending') return <Skeleton />;
  if (status === 'error') return <ErrorUI error={error} />;
  return <ProductGrid products={data} />;
}
```

#### useDebounce for Search
```typescript
import { useDebounce } from '@hooks/useAdvanced';

function SearchProducts({ onSearch }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      onSearch(debouncedQuery);
    }
  }, [debouncedQuery]);
}
```

#### useNetworkStatus
```typescript
import { useNetworkStatus } from '@hooks/useAdvanced';

function OfflineIndicator() {
  const isOnline = useNetworkStatus();
  
  if (!isOnline) {
    return <div className="alert alert-warning">شما آفلاین هستید</div>;
  }
}
```

### 6. **Code Organization** 📁

```
src/
├── components/          # Reusable components
│   ├── ui/             # Base UI components
│   ├── cards/          # Card components
│   └── Layout.tsx      # Main layout
├── pages/              # Page components
├── hooks/              # Custom hooks
│   ├── useAdvanced.ts  # Advanced hooks
│   ├── useAuth.ts      # Auth hooks
│   └── useGeo.ts       # Geo hooks
├── utils/
│   ├── performance.ts  # Performance utils
│   ├── security.ts     # Security utils
│   ├── analytics.ts    # Analytics utils
│   ├── api.ts          # API client
│   └── constants.ts    # Constants
├── context/            # React context
├── types/              # TypeScript types
└── services/           # API services
```

### 7. **TypeScript Patterns** 📝

#### Type-safe Props
```typescript
interface ProductCardProps {
  id: string;
  title: string;
  price: number;
  image?: string;
  onSelect?: (id: string) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  title,
  price,
  image,
  onSelect
}) => { /* ... */ };
```

#### Type-safe API Calls
```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: number;
}

async function fetchProducts(): Promise<Product[]> {
  const response = await apiRequest<ApiResponse<Product[]>>('/api/products');
  if (!response.success) throw new Error(response.error);
  return response.data || [];
}
```

### 8. **Performance Optimization Checklist** ✅

- [x] Code Splitting with React.lazy()
- [x] Image Optimization & Lazy Loading
- [x] Debouncing & Throttling
- [x] Memoization (React.memo, useMemo)
- [x] Virtual Scrolling for Lists
- [x] Caching Strategies
- [x] Bundle Analysis
- [x] Service Worker Optimization

### 9. **Testing Patterns** 🧪

```typescript
// Using Vitest
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAsync } from '@hooks/useAdvanced';

describe('useAsync', () => {
  it('should handle async operations', async () => {
    const { result } = renderHook(() => 
      useAsync(() => Promise.resolve('data'), false)
    );

    expect(result.current.status).toBe('idle');

    await act(async () => {
      await result.current.execute();
    });

    expect(result.current.status).toBe('success');
    expect(result.current.data).toBe('data');
  });
});
```

### 10. **SEO & Meta Tags** 🔍

```typescript
import { Helmet } from 'react-helmet-async';

function ProductDetail({ product }) {
  return (
    <>
      <Helmet>
        <title>{product.title} | کی‌داره</title>
        <meta name="description" content={product.description} />
        <meta property="og:title" content={product.title} />
        <meta property="og:image" content={product.image} />
        <meta property="og:price:amount" content={product.price.toString()} />
      </Helmet>
      {/* Component content */}
    </>
  );
}
```

## 📦 Dependencies بهتر

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "typescript": "^5.8.2",
    "vite": "^5.0.0",
    "tailwind": "^3.0.0",
    "react-router-dom": "^6.28.1",
    "@tanstack/react-query": "^5.0.0",
    "socket.io-client": "^4.8.3",
    "framer-motion": "^12.0.0",
    "zod": "^3.25.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "playwright": "^1.40.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0"
  }
}
```

## 🚀 Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| FCP | < 1.8s | ? |
| LCP | < 2.5s | ? |
| CLS | < 0.1 | ? |
| TTI | < 3.5s | ? |
| Bundle Size | < 200KB | ? |

## 📋 Checklist نهایی

- [ ] تمام components error boundary دارند
- [ ] تمام API calls سازمان‌یافته و logged هستند
- [ ] Performance metrics tracked می‌شوند
- [ ] Security best practices رعایت شده‌اند
- [ ] TypeScript strict mode فعال است
- [ ] Tests coverage > 80%
- [ ] Bundle size optimized است
- [ ] SEO tags تکمیل شده‌اند

---

**نسخه:** 1.0.0
**آخرین بروزرسانی:** 2026-07-06
**توسعه‌دهندگان:** Kidareh Team
