/**
 * OTP + send-rate store (Redis when available, otherwise memory via cache layer)
 */
import {
  cacheGet,
  cacheSet,
  cacheDel,
  CacheKeys,
  CacheTTL,
} from "./cache.js";

export interface OTPData {
  code: string;
  createdAt: number;
  attempts: number;
}

const OTP_TTL = CacheTTL.OTP; // seconds (default 300)
const RATE_TTL = 120; // 2 minutes between SMS

export async function setOtp(phone: string, code: string): Promise<void> {
  const data: OTPData = { code, createdAt: Date.now(), attempts: 0 };
  await cacheSet(CacheKeys.otp(phone), data, OTP_TTL);
}

export async function getOtp(phone: string): Promise<OTPData | null> {
  return cacheGet<OTPData>(CacheKeys.otp(phone));
}

export async function clearOtp(phone: string): Promise<void> {
  await cacheDel(CacheKeys.otp(phone));
}

/**
 * Verify OTP. Increments attempts. Deletes on success or max attempts.
 * Returns { ok, attemptsLeft }
 */
export async function verifyOtp(
  phone: string,
  code: string
): Promise<{ ok: boolean; attemptsLeft: number }> {
  const data = await getOtp(phone);
  if (!data) return { ok: false, attemptsLeft: 0 };

  if (Date.now() - data.createdAt > OTP_TTL * 1000) {
    await clearOtp(phone);
    return { ok: false, attemptsLeft: 0 };
  }

  if (data.attempts >= 3) {
    await clearOtp(phone);
    return { ok: false, attemptsLeft: 0 };
  }

  data.attempts += 1;
  const match = data.code === code;

  if (match) {
    await clearOtp(phone);
    return { ok: true, attemptsLeft: 3 - data.attempts };
  }

  if (data.attempts >= 3) {
    await clearOtp(phone);
    return { ok: false, attemptsLeft: 0 };
  }

  // persist incremented attempts with remaining TTL
  const elapsedSec = Math.floor((Date.now() - data.createdAt) / 1000);
  const remain = Math.max(1, OTP_TTL - elapsedSec);
  await cacheSet(CacheKeys.otp(phone), data, remain);
  return { ok: false, attemptsLeft: 3 - data.attempts };
}

export async function getSendRate(phone: string): Promise<number | null> {
  const ts = await cacheGet<number>(CacheKeys.otpRate(phone));
  return ts;
}

export async function setSendRate(phone: string): Promise<void> {
  await cacheSet(CacheKeys.otpRate(phone), Date.now(), RATE_TTL);
}

export async function clearSendRate(phone: string): Promise<void> {
  await cacheDel(CacheKeys.otpRate(phone));
}

export { RATE_TTL };
