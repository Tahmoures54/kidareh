import { describe, it, expect } from 'vitest';
import { compressImage } from './imageCompression';

describe('Image Compression Utility', () => {
  it('should reject non-image files immediately', async () => {
    // یک فایل متنی (Text) برای تست
    const fakeTextFile = new File(['hello world'], 'document.txt', { type: 'text/plain' });

    await expect(compressImage(fakeTextFile))
      .rejects
      .toThrow('فایل انتخاب شده تصویر نیست.');
  });
});