/**
 * Integration Guide - Instagram-Level Infrastructure
 * 
 * This document shows exactly how to integrate all the new utilities
 * into your existing Kidareh application
 */

// ============================================================================
// STEP 1: Update main.tsx
// ============================================================================

/**
 * Location: src/main.tsx
 * Purpose: Initialize all monitoring, error handling, and analytics
 */

// Add imports at the top
import React from 'react'
import ReactDOM from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import { GlobalErrorBoundary } from '@components/ui/GlobalErrorBoundary'
import { apiService } from '@services/api'
import { analytics, errorLogger, performanceLogger } from '@utils/analytics'
import { trackWebVitals } from '@utils/performance'
import { ENV, validateConfig } from '@config/env'
import App from './App'
import './index.css'

// Validate environment configuration
validateConfig()

// Initialize Web Vitals tracking
trackWebVitals((metric) => {
  // Track to analytics
  analytics.trackEvent({
    name: 'web_vital',
    category: 'performance',
    label: metric.name,
    value: Math.round(metric.value),
    metadata: { rating: metric.rating },
  })

  // Log to console in development
  if (ENV.isDevelopment) {
    console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`)
  }
})

// Setup API interceptors
apiService.addRequestInterceptor((config) => {
  // Add custom headers
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Request-ID': Math.random().toString(36).substr(2, 9),
    },
  }
})

apiService.addResponseInterceptor((response) => {
  // Log response time
  const time = performance.now()
  return response
})

apiService.addErrorInterceptor(async (error) => {
  // Handle 401 Unauthorized
  if (error.message.includes('401')) {
    localStorage.removeItem(ENV.AUTH_TOKEN_KEY)
    window.location.href = '/login'
  }
  // Handle 429 Too Many Requests (rate limit)
  if (error.message.includes('429')) {
    errorLogger.logWarning('Rate limit exceeded', {
      retryAfter: error.message,
    })
  }
})

// Global error handling for unhandled rejections
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.logError('Unhandled Promise Rejection', event.reason)
})

// Global error handling for errors
window.addEventListener('error', (event) => {
  errorLogger.logError('Global Error', event.error || new Error(event.message))
})

// Render app with error boundary
const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <HelmetProvider>
        <App />
      </HelmetProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>,
)

// ============================================================================
// STEP 2: Update App.tsx
// ============================================================================

/**
 * Location: src/App.tsx
 * Purpose: Add analytics tracking to page navigation
 */

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { analytics } from '@utils/analytics'

function App() {
  const location = useLocation()

  // Track page views
  useEffect(() => {
    analytics.trackEvent({
      name: 'page_view',
      category: 'navigation',
      label: location.pathname,
      metadata: {
        referrer: document.referrer,
        timestamp: new Date().toISOString(),
      },
    })

    // Set document title for SEO
    document.title = getPageTitle(location.pathname)
  }, [location.pathname])

  return (
    // Your existing app structure
  )
}

// ============================================================================
// STEP 3: Add to ProductCard Component
// ============================================================================

/**
 * Location: src/components/cards/ProductCard.tsx
 * Purpose: Track product interactions and optimize images
 */

import { useIntersectionObserver, getOptimizedImageSrc } from '@utils/performance'
import { analytics } from '@utils/analytics'

function ProductCard({ id, image, title, price, onSelect }) {
  const { ref, isVisible } = useIntersectionObserver()

  const handleClick = () => {
    analytics.trackEvent({
      name: 'product_click',
      category: 'engagement',
      label: 'product_card',
      value: id,
      metadata: { price, title },
    })
    onSelect?.(id)
  }

  return (
    <div ref={ref} onClick={handleClick} className="product-card">
      {isVisible && (
        <img
          src={getOptimizedImageSrc(image, 300)}
          alt={title}
          loading="lazy"
        />
      )}
      <h3>{title}</h3>
      <p>{price} تومان</p>
    </div>
  )
}

// ============================================================================
// STEP 4: Update Search Component
// ============================================================================

/**
 * Location: src/pages/Search/index.tsx
 * Purpose: Add debounced search with analytics
 */

import { useDebounce } from '@hooks/useAdvanced'
import { analytics } from '@utils/analytics'

function SearchPage() {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebounce(query, 300)

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      analytics.trackEvent({
        name: 'search',
        category: 'engagement',
        label: 'search_input',
        metadata: { query: debouncedQuery, queryLength: debouncedQuery.length },
      })
      performSearch(debouncedQuery)
    }
  }, [debouncedQuery])

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="جستجو..."
    />
  )
}

// ============================================================================
// STEP 5: Update API Calls
// ============================================================================

/**
 * Location: Any service or hook making API calls
 * Purpose: Use new API service with interceptors and caching
 */

import { apiService } from '@services/api'
import { errorLogger } from '@utils/analytics'

// Replace old fetch calls
async function fetchProducts(category?: string) {
  const response = await apiService.get('/products', {
    params: { category },
    cache: true,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
  })

  if (!response.success) {
    errorLogger.logError('Failed to fetch products', new Error(response.error))
    throw new Error(response.error)
  }

  return response.data
}

// ============================================================================
// STEP 6: Add Offline Detection
// ============================================================================

/**
 * Location: src/components/Layout.tsx
 * Purpose: Show offline indicator
 */

import { useNetworkStatus } from '@hooks/useAdvanced'

function Layout() {
  const isOnline = useNetworkStatus()

  return (
    <div>
      {!isOnline && (
        <div className="bg-yellow-500 text-white p-2 text-center">
          ⚠️ شما به اینترنت متصل نیستید
        </div>
      )}
      {/* Rest of layout */}
    </div>
  )
}

// ============================================================================
// STEP 7: Add Performance Monitoring Dashboard (Optional)
// ============================================================================

/**
 * Location: src/pages/Admin/PerformanceDashboard.tsx
 * Purpose: Monitor app performance in real-time
 */

import { useEffect, useState } from 'react'
import { apiService } from '@services/api'
import { performanceLogger } from '@utils/analytics'

function PerformanceDashboard() {
  const [metrics, setMetrics] = useState({})

  useEffect(() => {
    // Get cache stats
    const cacheStats = apiService.getCacheStats()

    // Log performance metrics
    performanceLogger.logPageMetrics()

    setMetrics({
      cacheSize: cacheStats.size,
      cachedKeys: cacheStats.keys.length,
      timestamp: new Date().toISOString(),
    })
  }, [])

  return (
    <div className="p-6">
      <h1>عملکرد تطبیق</h1>
      <pre>{JSON.stringify(metrics, null, 2)}</pre>
    </div>
  )
}

// ============================================================================
// STEP 8: Environment Configuration
// ============================================================================

/**
 * Create .env.local file in project root
 */

# API
VITE_API_URL=http://localhost:8000/api
VITE_API_TIMEOUT=20000

# Analytics
VITE_ANALYTICS_ENABLED=true
VITE_LOG_LEVEL=debug
VITE_LOG_TO_CONSOLE=true

# Features
VITE_FEATURE_AI_ASSISTANT=true
VITE_FEATURE_VOICE_SEARCH=false
VITE_FEATURE_REAL_TIME_CHAT=true
VITE_FEATURE_PWA=true
VITE_FEATURE_OFFLINE_MODE=true
VITE_FEATURE_NOTIFICATIONS=true

# External Services (Optional)
VITE_SENTRY_DSN=
VITE_GA_ID=
VITE_GEMINI_API_KEY=
VITE_MAPBOX_TOKEN=
VITE_FACEBOOK_APP_ID=
VITE_TWITTER_HANDLE=@kidareh

# ============================================================================
// STEP 9: Update Tests
// ============================================================================

/**
 * Location: tests/frontend/hooks/useAdvanced.test.ts
 * Example test for advanced hooks
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAsync, useDebounce, useLocalStorage } from '@hooks/useAdvanced'

describe('useAsync', () => {
  it('should handle async operations correctly', async () => {
    const mockFetch = async () => 'data'

    const { result } = renderHook(() =>
      useAsync(mockFetch, false)
    )

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.execute()
    })

    await waitFor(() => {
      expect(result.current.status).toBe('success')
      expect(result.current.data).toBe('data')
    })
  })
})

describe('useDebounce', () => {
  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated' })

    // Wait for debounce
    await waitFor(() => {
      expect(result.current).toBe('updated')
    }, { timeout: 500 })
  })
})

// ============================================================================
// STEP 10: Monitoring & Alerting
// ============================================================================

/**
 * Setup error tracking in package.json
 */

"scripts": {
  "dev": "vite",
  "build": "tsc && vite build",
  "analyze": "npm run build -- --analyze",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage"
}

// ============================================================================
// VERIFICATION CHECKLIST
// ============================================================================

/**
 * After integration, verify:
 * 
 * [ ] main.tsx initializes GlobalErrorBoundary
 * [ ] Performance tracking is active (check console in dev)
 * [ ] API service is intercepting requests
 * [ ] Analytics events are being batched
 * [ ] Error logs are being sent
 * [ ] Environment variables are loaded
 * [ ] TypeScript compiles without errors
 * [ ] Network tab shows proper cache headers
 * [ ] Chrome DevTools shows Web Vitals
 * [ ] Offline indicator appears when disconnected
 * 
 * Performance targets:
 * [ ] LCP < 2.5s
 * [ ] FCP < 1.8s
 * [ ] CLS < 0.1
 * [ ] Bundle size < 200KB
 */

export default {
  instructions: 'Follow steps 1-10 to fully integrate Instagram-level infrastructure'
}
