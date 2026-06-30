// ==========================================
// 1. Types & Options
// ==========================================
export interface CompressOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // بین 0 تا 1
  outputFormat?: 'image/jpeg' | 'image/webp' | 'image/png' | 'auto';
  fillWhiteBackground?: boolean; // پر کردن پس‌زمینه سفید (Transparency)
}

// ==========================================
// 2. TypeScript Overloads
// ==========================================
export async function compressImage(file: File, options: CompressOptions & { outputType: 'base64' }): Promise<string>;
export async function compressImage(file: File, options?: CompressOptions & { outputType?: 'file' }): Promise<File>;

export async function compressImage(
  file: File,
  options: CompressOptions & { outputType?: 'file' | 'base64' } = {}
): Promise<File | string> {
  
  const {
    maxWidth = 1080,
    maxHeight = 1080,
    outputFormat = 'auto',
    outputType = 'file',
    fillWhiteBackground = true,
  } = options;

  const quality = Math.max(0, Math.min(1, options.quality ?? 0.8));

  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('فایل انتخاب شده تصویر نیست.'));
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const MAX_CANVAS_SIZE = 8192;
      if (width > MAX_CANVAS_SIZE || height > MAX_CANVAS_SIZE) {
        const ratio = Math.min(MAX_CANVAS_SIZE / width, MAX_CANVAS_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('مرورگر شما از Canvas پشتیبانی نمی‌کند.'));
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      let finalFormat = outputFormat;
      if (finalFormat === 'auto') {
        const isWebpSupported = (() => {
          const testCanvas = document.createElement('canvas');
          testCanvas.width = 1;
          testCanvas.height = 1;
          return testCanvas.toDataURL('image/webp').startsWith('data:image/webp');
        })();

        if (file.type === 'image/png') {
          finalFormat = isWebpSupported ? 'image/webp' : 'image/png';
        } else {
          finalFormat = isWebpSupported ? 'image/webp' : 'image/jpeg';
        }
      }

      if (fillWhiteBackground && finalFormat === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.drawImage(img, 0, 0, width, height);

      if (outputType === 'base64') {
        const dataUrl = canvas.toDataURL(finalFormat, quality);
        cleanup(canvas, img);
        resolve(dataUrl);
      } else {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('خطا در فشرده‌سازی تصویر.'));
              return;
            }
            
            const ext = finalFormat.split('/')[1];
            let baseName = file.name.replace(/\.[^/.]+$/, '');
            if (!baseName) baseName = 'image';
            
            const newFileName = `${baseName}_compressed.${ext}`;
            
            const compressedFile = new File([blob], newFileName, {
              type: finalFormat,
              lastModified: Date.now(),
            });

            cleanup(canvas, img);
            resolve(compressedFile);
          },
          finalFormat,
          quality
        );
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('امکان بارگذاری تصویر وجود ندارد.'));
    };

    img.src = objectUrl;
  });
}

const cleanup = (canvas: HTMLCanvasElement, img: HTMLImageElement) => {
  canvas.width = 0;
  canvas.height = 0;
  img.src = '';
  img.onload = null;
  img.onerror = null;
};