/**
 * Security Utilities
 * Instagram-level security practices
 */

/* ====================== INPUT SANITIZATION ====================== */

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return input.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Validate and sanitize URLs
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Only allow http, https, and mailto
    if (!['http:', 'https:', 'mailto:'].includes(parsed.protocol)) {
      return '';
    }
    return url;
  } catch {
    return '';
  }
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format (Persian/International)
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^(\+98|0)?9\d{9}$/;
  return phoneRegex.test(phone.replace(/[^0-9+]/g, ''));
}

/* ====================== CSRF PROTECTION ====================== */

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return token;
}

/**
 * Store CSRF token
 */
export function storeCSRFToken(token: string): void {
  sessionStorage.setItem('csrf-token', token);
}

/**
 * Get CSRF token
 */
export function getCSRFToken(): string {
  return sessionStorage.getItem('csrf-token') || '';
}

/* ====================== RATE LIMITING ====================== */

class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  private maxAttempts: number;
  private windowMs: number;

  constructor(maxAttempts = 5, windowMs = 60000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Filter out old attempts
    const recentAttempts = attempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

export const globalRateLimiter = new RateLimiter(5, 60000); // 5 attempts per minute

/* ====================== TOKEN MANAGEMENT ====================== */

/**
 * Legacy credential cleanup. Authentication is intentionally cookie-only.
 */
export class SecureTokenManager {
  static setToken(_token: string, _expiryMs = 3600000): void {
    console.warn("SecureTokenManager.setToken is deprecated; sessions use HttpOnly cookies.");
  }
  static getToken(): null { return null; }
  static isTokenValid(): boolean { return false; }
  static clearToken(): void {
    ["auth_token_v1", "auth_token_expiry_v1", "auth_refresh_token_v1", "kidareh_token_v1", "token"].forEach((key) => localStorage.removeItem(key));
  }
  static setRefreshToken(_token: string): void {
    console.warn("SecureTokenManager.setRefreshToken is deprecated; sessions use HttpOnly cookies.");
  }
  static getRefreshToken(): null { return null; }
}

/* ====================== CONTENT SECURITY POLICY ====================== */

/**
 * Set security headers (should be done on server)
 */
export function setSecurityHeaders(): void {
  // Note: These should be set on the server for better security
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  };

  // This is a placeholder - actual headers should be set on server
  console.log('Security headers configuration:', headers);
}

export default {
  sanitizeInput,
  sanitizeUrl,
  isValidEmail,
  isValidPhone,
  generateCSRFToken,
  storeCSRFToken,
  getCSRFToken,
  RateLimiter,
  globalRateLimiter,
  SecureTokenManager,
};
