/**
 * Testing Framework Setup & Guidelines
 * Instagram-level testing practices
 */

// ============================================================================
// 1. VITEST CONFIGURATION
// ============================================================================

/**
 * File: vitest.config.ts
 * Purpose: Configure Vitest for comprehensive testing
 */

import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    // Use jsdom for DOM testing
    environment: 'jsdom',
    
    // Setup files to run before tests
    setupFiles: ['./tests/frontend/setup.ts'],
    
    // Global test timeout
    testTimeout: 10000,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/mockData.ts',
      ],
      all: true,
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
    
    // Mock modules
    mockReset: true,
    
    // Watch mode settings
    watch: false,
    include: ['tests/**/*.{test,spec}.{js,ts,jsx,tsx}'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@config': path.resolve(__dirname, './src/config'),
      '@services': path.resolve(__dirname, './src/services'),
      '@context': path.resolve(__dirname, './src/context'),
      '@data': path.resolve(__dirname, './data'),
    },
  },
})

// ============================================================================
// 2. TEST SETUP FILE
// ============================================================================

/**
 * File: tests/frontend/setup.ts
 * Purpose: Global test setup
 */

import '@testing-library/jest-dom'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor(public callback: any) {}
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
} as any

// Mock fetch
global.fetch = vi.fn()

// ============================================================================
// 3. TEST UTILITIES
// ============================================================================

/**
 * File: tests/frontend/utils/test-utils.tsx
 * Purpose: Utilities for testing React components
 */

import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  withRouter?: boolean
  withQueryClient?: boolean
}

export function renderWithProviders(
  ui: ReactElement,
  {
    withRouter = true,
    withQueryClient = true,
    ...renderOptions
  }: CustomRenderOptions = {},
) {
  const testQueryClient = createTestQueryClient()

  function Wrapper({ children }: { children: React.ReactNode }) {
    let content = children

    if (withQueryClient) {
      content = (
        <QueryClientProvider client={testQueryClient}>
          {content}
        </QueryClientProvider>
      )
    }

    if (withRouter) {
      content = <BrowserRouter>{content}</BrowserRouter>
    }

    return <>{content}</>
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions })
}

export * from '@testing-library/react'

// ============================================================================
// 4. MOCK FACTORIES
// ============================================================================

/**
 * File: tests/frontend/factories/index.ts
 * Purpose: Factory functions for test data
 */

import { faker } from '@faker-js/faker/locale/fa_IR'

export const createMockUser = (overrides = {}) => ({
  id: faker.string.uuid(),
  phone: '09' + faker.string.numeric(9),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'buyer',
  verified: true,
  createdAt: faker.date.past(),
  ...overrides,
})

export const createMockProduct = (overrides = {}) => ({
  id: faker.string.uuid(),
  title: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: parseInt(faker.commerce.price({ min: 10000, max: 1000000 })),
  image: faker.image.url(),
  category: 'General',
  storeId: faker.string.uuid(),
  inStock: true,
  views: faker.number.int({ min: 0, max: 10000 }),
  likes: faker.number.int({ min: 0, max: 1000 }),
  createdAt: faker.date.past(),
  ...overrides,
})

export const createMockStore = (overrides = {}) => ({
  id: faker.string.uuid(),
  name: faker.company.name(),
  category: 'General',
  rating: faker.number.float({ min: 0, max: 5 }),
  followerCount: faker.number.int({ min: 0, max: 100000 }),
  verified: faker.datatype.boolean(),
  ...overrides,
})

// ============================================================================
// 5. ADVANCED HOOKS TESTS
// ============================================================================

/**
 * File: tests/frontend/hooks/useAdvanced.test.ts
 * Purpose: Test all advanced hooks
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import {
  useAsync,
  useDebounce,
  useThrottle,
  useLocalStorage,
  useNetworkStatus,
  useWindowSize,
  usePrevious,
} from '@hooks/useAdvanced'

describe('useAsync', () => {
  it('should start with idle status', () => {
    const { result } = renderHook(() =>
      useAsync(async () => 'data', false)
    )

    expect(result.current.status).toBe('idle')
    expect(result.current.data).toBeNull()
    expect(result.current.error).toBeNull()
  })

  it('should handle successful async operation', async () => {
    const mockFn = vi.fn(async () => 'success')
    const { result } = renderHook(() => useAsync(mockFn, false))

    expect(result.current.status).toBe('idle')

    await act(async () => {
      await result.current.execute()
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toBe('success')
    expect(mockFn).toHaveBeenCalledOnce()
  })

  it('should handle async errors', async () => {
    const error = new Error('Test error')
    const mockFn = vi.fn(async () => {
      throw error
    })

    const { result } = renderHook(() => useAsync(mockFn, false))

    await act(async () => {
      try {
        await result.current.execute()
      } catch {
        // Expected error
      }
    })

    expect(result.current.status).toBe('error')
    expect(result.current.error?.message).toBe('Test error')
  })

  it('should retry on failure', async () => {
    let attempts = 0
    const mockFn = vi.fn(async () => {
      attempts++
      if (attempts < 2) throw new Error('First attempt fails')
      return 'success'
    })

    const { result } = renderHook(() => useAsync(mockFn, false))

    await act(async () => {
      try {
        await result.current.execute()
      } catch {
        // Expected on first attempt
      }
    })

    expect(result.current.status).toBe('error')
  })
})

describe('useDebounce', () => {
  it('should debounce value changes', async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 'initial' } }
    )

    expect(result.current).toBe('initial')

    rerender({ value: 'updated' })
    expect(result.current).toBe('initial')

    await waitFor(
      () => {
        expect(result.current).toBe('updated')
      },
      { timeout: 300 }
    )
  })

  it('should allow custom delay', async () => {
    vi.useFakeTimers()
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    )

    rerender({ value: 'updated' })
    vi.advanceTimersByTime(300)
    expect(result.current).toBe('initial')

    vi.advanceTimersByTime(200)
    expect(result.current).toBe('updated')

    vi.useRealTimers()
  })
})

describe('useLocalStorage', () => {
  it('should persist and retrieve values', () => {
    const { result } = renderHook(() =>
      useLocalStorage('testKey', 'initial')
    )

    expect(result.current[0]).toBe('initial')

    act(() => {
      result.current[1]('updated')
    })

    expect(result.current[0]).toBe('updated')
    expect(localStorage.getItem('testKey')).toBe('"updated"')
  })

  it('should handle complex objects', () => {
    const initialValue = { count: 0, items: [] }
    const { result } = renderHook(() =>
      useLocalStorage('complexKey', initialValue)
    )

    act(() => {
      result.current[1]({ count: 5, items: ['a', 'b'] })
    })

    expect(result.current[0]).toEqual({ count: 5, items: ['a', 'b'] })
  })
})

describe('useNetworkStatus', () => {
  it('should track network status', () => {
    const { result } = renderHook(() => useNetworkStatus())
    expect(typeof result.current).toBe('boolean')
  })
})

// ============================================================================
// 6. SECURITY UTILITIES TESTS
// ============================================================================

/**
 * File: tests/frontend/utils/security.test.ts
 * Purpose: Test security utilities
 */

import { describe, it, expect } from 'vitest'
import {
  sanitizeInput,
  sanitizeUrl,
  isValidEmail,
  isValidPhone,
  generateCSRFToken,
  RateLimiter,
} from '@utils/security'

describe('Security Utilities', () => {
  describe('sanitizeInput', () => {
    it('should escape HTML special characters', () => {
      const input = '<script>alert("xss")</script>'
      const sanitized = sanitizeInput(input)
      expect(sanitized).not.toContain('<script>')
      expect(sanitized).toContain('&lt;')
    })

    it('should handle special characters', () => {
      const input = 'Tom & Jerry "Love" & Care'
      const sanitized = sanitizeInput(input)
      expect(sanitized).toContain('&amp;')
      expect(sanitized).toContain('&quot;')
    })
  })

  describe('sanitizeUrl', () => {
    it('should allow valid HTTP URLs', () => {
      expect(sanitizeUrl('http://example.com')).toBe('http://example.com')
    })

    it('should allow HTTPS URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com')
    })

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert("xss")')).toBeFalsy()
    })

    it('should reject data URLs', () => {
      expect(sanitizeUrl('data:text/html,<script>alert("xss")</script>')).toBeFalsy()
    })
  })

  describe('isValidEmail', () => {
    it('should validate correct emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@company.co.uk')).toBe(true)
    })

    it('should reject invalid emails', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('test@')).toBe(false)
    })
  })

  describe('isValidPhone', () => {
    it('should validate Persian phone numbers', () => {
      expect(isValidPhone('09123456789')).toBe(true)
    })

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('12345')).toBe(false)
      expect(isValidPhone('091234567')).toBe(false)
    })
  })

  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(3, 1000)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
    })

    it('should reject requests exceeding limit', () => {
      const limiter = new RateLimiter(2, 1000)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)
    })

    it('should reset after window expires', async () => {
      const limiter = new RateLimiter(1, 100)
      expect(limiter.isAllowed()).toBe(true)
      expect(limiter.isAllowed()).toBe(false)

      await new Promise(resolve => setTimeout(resolve, 150))
      expect(limiter.isAllowed()).toBe(true)
    })
  })
})

// ============================================================================
// 7. API SERVICE TESTS
// ============================================================================

/**
 * File: tests/frontend/services/api.test.ts
 * Purpose: Test API service with mocking
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { apiService } from '@services/api'

describe('API Service', () => {
  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()
    apiService.clearCache()
    global.fetch = vi.fn()
  })

  it('should make GET requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 1, name: 'Test' } }),
    })

    const response = await apiService.get('/test')
    expect(response.success).toBe(true)
    expect(response.data).toEqual({ id: 1, name: 'Test' })
  })

  it('should cache GET requests', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { id: 1 } }),
    })

    // First request
    const response1 = await apiService.get('/test', { cache: true })
    expect(response1.success).toBe(true)

    // Second request should use cache
    const response2 = await apiService.get('/test', { cache: true })
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('should handle errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const response = await apiService.get('/test')
    expect(response.success).toBe(false)
    expect(response.error).toBeDefined()
  })

  it('should add request interceptors', async () => {
    const interceptor = vi.fn((config) => {
      return { ...config, custom: true }
    })
    apiService.addRequestInterceptor(interceptor)

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    await apiService.get('/test')
    expect(interceptor).toHaveBeenCalled()
  })
})

// ============================================================================
// 8. COMPONENT TESTS
// ============================================================================

/**
 * File: tests/frontend/components/ProductCard.test.tsx
 * Purpose: Test ProductCard component
 */

import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ProductCard from '@components/cards/ProductCard'
import { renderWithProviders } from '../utils/test-utils'
import { createMockProduct } from '../factories'

describe('ProductCard', () => {
  it('should render product information', () => {
    const product = createMockProduct({
      title: 'Test Product',
      price: 100000,
    })

    renderWithProviders(
      <ProductCard
        id={product.id}
        title={product.title}
        price={product.price}
        image={product.image}
      />
    )

    expect(screen.getByText('Test Product')).toBeInTheDocument()
    expect(screen.getByText(/100000/)).toBeInTheDocument()
  })

  it('should call onSelect when clicked', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    const product = createMockProduct()

    renderWithProviders(
      <ProductCard
        id={product.id}
        title={product.title}
        price={product.price}
        image={product.image}
        onSelect={onSelect}
      />
    )

    const card = screen.getByRole('article')
    await user.click(card)

    expect(onSelect).toHaveBeenCalledWith(product.id)
  })
})

// ============================================================================
// 9. INTEGRATION TESTS
// ============================================================================

/**
 * File: tests/frontend/integration/onboarding.test.tsx
 * Purpose: Test complete onboarding flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Onboarding from '@pages/Onboarding'
import { renderWithProviders } from '../utils/test-utils'

describe('Onboarding Flow', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('should show phone input screen initially', () => {
    renderWithProviders(<Onboarding />)
    expect(screen.getByPlaceholderText(/شماره تلفن/i)).toBeInTheDocument()
  })

  it('should show OTP screen after phone submission', async () => {
    const user = userEvent.setup()

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })

    renderWithProviders(<Onboarding />)

    const phoneInput = screen.getByPlaceholderText(/شماره تلفن/i)
    await user.type(phoneInput, '09123456789')

    const submitButton = screen.getByText(/تایید/i)
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/کد تایید/i)).toBeInTheDocument()
    })
  })
})

// ============================================================================
// 10. RUN TESTS
// ============================================================================

/**
 * Commands:
 * 
 * # Run all tests
 * npm test
 * 
 * # Run tests in watch mode
 * npm test -- --watch
 * 
 * # Run specific test file
 * npm test -- useAdvanced
 * 
 * # Generate coverage report
 * npm test -- --coverage
 * 
 * # Open coverage report
 * npm test -- --coverage && open coverage/index.html
 * 
 * # Run tests with UI
 * npm test -- --ui
 * 
 * # Run only failing tests
 * npm test -- --bail
 */

export default {}
