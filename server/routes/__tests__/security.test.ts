// server/routes/__tests__/security.test.ts
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ÇÓÊÎÑÇÌ Schema ÇÒ ˜Ï payment.ts ÔãÇ ÈÑÇí ÊÓÊ
const initiateSchema = z.object({
  amount: z.number().min(5000, "ÍÏÇŞá ãÈáÛ ?,??? ÊæãÇä ÇÓÊ").max(50000000, "ÍÏÇ˜ËÑ ãÈáÛ ãÌÇÒ ?? ãíáíæä ÊæãÇä ÇÓÊ"),
  returnUrl: z.string().url("ÂÏÑÓ ÈÇÒÔÊ äÇãÚÊÈÑ ÇÓÊ")
});

describe('Backend Payment Security Logic', () => {
  
  it('should accept valid payment requests', () => {
    const validData = { amount: 50000, returnUrl: 'https://kidareh.liara.run/callback' };
    const result = initiateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject payments below 5,000 Tomans', () => {
    const invalidData = { amount: 4000, returnUrl: 'https://kidareh.liara.run/callback' };
    const result = initiateSchema.safeParse(invalidData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("ÍÏÇŞá ãÈáÛ ?,??? ÊæãÇä ÇÓÊ");
    }
  });

  it('should reject massive payment amounts (over 50M)', () => {
    const massiveData = { amount: 60000000, returnUrl: 'https://kidareh.liara.run/callback' };
    const result = initiateSchema.safeParse(massiveData);
    
    expect(result.success).toBe(false);
  });

  it('should reject invalid return URLs', () => {
    const badUrlData = { amount: 10000, returnUrl: 'not-a-valid-url' };
    const result = initiateSchema.safeParse(badUrlData);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toBe("ÂÏÑÓ ÈÇÒÔÊ äÇãÚÊÈÑ ÇÓÊ");
    }
  });
});