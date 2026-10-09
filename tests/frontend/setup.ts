// تنظیم متغیرهای محیطی ایزوله برای تست‌های بک‌اند و فرانت‌اند.
process.env.NODE_ENV ??= "test";
process.env.DATABASE_URL ??= "./.test-data/kidareh-vitest.db";
process.env.JWT_SECRET ??= "test-only-jwt-secret-with-sufficient-length-123456";
process.env.COOKIE_SECRET ??= "test-only-cookie-secret-with-sufficient-length-123456";
process.env.APP_URL ??= "http://localhost:3000";
process.env.ADMIN_PHONE ??= "09120000000";
process.env.SHOW_OTP_IN_DEV ??= "false";
process.env.REDIS_ENABLED ??= "false";
import '@testing-library/jest-dom';
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

expect.extend(matchers);
afterEach(() => {
  cleanup();
});