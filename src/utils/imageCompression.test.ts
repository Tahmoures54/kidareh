// src/utils/imageCompression.test.ts
import { describe, it, expect } from 'vitest';
import { compressImage } from './imageCompression';

describe('Image Compression Utility', () => {
  it('should reject non-image files immediately', async () => {
    // ÓÇÎÊ í˜ İÇíá ãÊäí (Text) Èå ÌÇí Ú˜Ó
    const fakeTextFile = new File(['hello world'], 'document.txt', { type: 'text/plain' });

    // ÇäÊÙÇÑ ÏÇÑíã ÓíÓÊã İÔÑÏåÓÇÒí ÇÑæÑ ÈÏåÏ æ ãÊä ÇÑæÑ ÏŞíŞÇğ Çíä ÈÇÔÏ
    await expect(compressImage(fakeTextFile))
      .rejects
      .toThrow('İÇíá ÇäÊÎÇÈ ÔÏå ÊÕæíÑ äíÓÊ.');
  });
});