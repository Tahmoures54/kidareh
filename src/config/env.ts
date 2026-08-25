/**
 * Environment Configuration
 * Instagram-level configuration management
 */

export const ENV = {
  // App Info
  APP_NAME: 'کی‌داره',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '1.0.0',
  
  // Environment
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  env: import.meta.env.MODE,
  
  // API
  API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  API_TIMEOUT: parseInt(import.meta.env.VITE_API_TIMEOUT || '20000'),
  
  // Authentication
  AUTH_TOKEN_KEY: 'auth_token_v1',
  AUTH_REFRESH_KEY: 'auth_refresh_v1',
  AUTH_EXPIRY_KEY: 'auth_expiry_v1',
  TOKEN_REFRESH_BUFFER: 5 * 60 * 1000, // Refresh 5 minutes before expiry
  
  // Cache
  CACHE_TTL: 5 * 60 * 1000, // 5 minutes
  USER_CACHE_TTL: 10 * 60 * 1000, // 10 minutes
  LIST_CACHE_TTL: 2 * 60 * 1000, // 2 minutes
  
  // Limits
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGE_WIDTH: 2000,
  MAX_IMAGE_HEIGHT: 2000,
  MAX_IMAGE_QUALITY: 0.8,
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  INFINITE_SCROLL_PAGE_SIZE: 10,
  
  // Timeouts
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 500,
  TOAST_DURATION: 3000,
  
  // Geolocation
  DEFAULT_LATITUDE: 35.6892,
  DEFAULT_LONGITUDE: 51.3890,
  DEFAULT_ZOOM: 14,
  LOCATION_MAX_RADIUS_KM: 50,
  
  // Analytics
  ANALYTICS_ENABLED: import.meta.env.VITE_ANALYTICS_ENABLED === 'true',
  ANALYTICS_BATCH_SIZE: 10,
  ANALYTICS_FLUSH_INTERVAL: 5000,
  
  // Feature Flags
  FEATURES: {
    AI_ASSISTANT: import.meta.env.VITE_FEATURE_AI_ASSISTANT !== 'false',
    VOICE_SEARCH: import.meta.env.VITE_FEATURE_VOICE_SEARCH !== 'false',
    REAL_TIME_CHAT: import.meta.env.VITE_FEATURE_REAL_TIME_CHAT !== 'false',
    PWA: import.meta.env.VITE_FEATURE_PWA !== 'false',
    OFFLINE_MODE: import.meta.env.VITE_FEATURE_OFFLINE_MODE !== 'false',
    NOTIFICATIONS: import.meta.env.VITE_FEATURE_NOTIFICATIONS !== 'false',
    SHARING: import.meta.env.VITE_FEATURE_SHARING !== 'false',
  },
  
  // Logging
  LOG_LEVEL: (import.meta.env.VITE_LOG_LEVEL || 'info') as 'debug' | 'info' | 'warn' | 'error',
  LOG_TO_CONSOLE: import.meta.env.VITE_LOG_TO_CONSOLE !== 'false',
  LOG_TO_SERVER: import.meta.env.VITE_LOG_TO_SERVER === 'true',
  
  // Security
  RATE_LIMIT_ENABLED: import.meta.env.VITE_RATE_LIMIT_ENABLED !== 'false',
  RATE_LIMIT_MAX_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW_MS: 60000,
  
  // CDN
  CDN_URL: import.meta.env.VITE_CDN_URL || '',
  ASSET_URL: import.meta.env.VITE_ASSET_URL || '',
  
  // Sentry/Error Tracking
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  SENTRY_ENABLED: !!import.meta.env.VITE_SENTRY_DSN,
  
  // Google Analytics
  GA_ID: import.meta.env.VITE_GA_ID || '',
  GA_ENABLED: !!import.meta.env.VITE_GA_ID,
  
  // Social Media
  SHARE_FACEBOOK_APP_ID: import.meta.env.VITE_FACEBOOK_APP_ID || '',
  SHARE_TWITTER_HANDLE: import.meta.env.VITE_TWITTER_HANDLE || '@kidareh',
  
  // Maps
  MAPBOX_TOKEN: import.meta.env.VITE_MAPBOX_TOKEN || '',
  GOOGLE_MAPS_KEY: import.meta.env.VITE_GOOGLE_MAPS_KEY || '',
  
  // AI
  GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  AI_ENABLED: !!import.meta.env.VITE_GEMINI_API_KEY,
} as const;

/**
 * Validate environment configuration
 */
export function validateConfig(): boolean {
  const requiredVars = [
    'VITE_API_URL',
    // Add more required vars as needed
  ];

  const missing = requiredVars.filter(
    (key) => !import.meta.env[key]
  );

  if (missing.length > 0) {
    console.warn('⚠️ Missing environment variables:', missing);
  }

  return true;
}

/**
 * Get API endpoint
 */
export function getApiUrl(endpoint: string): string {
  const base = ENV.API_URL.replace(/\/$/, '');
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Get CDN URL for assets
 */
export function getCdnUrl(path: string): string {
  if (!ENV.CDN_URL) return path;
  const base = ENV.CDN_URL.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

/**
 * Is feature enabled
 */
export function isFeatureEnabled(feature: keyof typeof ENV.FEATURES): boolean {
  return ENV.FEATURES[feature];
}

export default ENV;
