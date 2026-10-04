export interface CompressedImageResult {
  base64Data: string;
  dataUrl: string;
  sizeBytes: number;
  sizeFormatted: string;
  width: number;
  height: number;
  contentType: 'image/jpeg' | 'image/webp' | 'image/png';
  fileName: string;
}

export const TARGET_MAX_BYTES = 40960; // 40 KB strict limit

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Compresses an image file in the browser using HTML5 Canvas
 * Ensures resulting file is strictly <= targetMaxBytes (default 40KB)
 */
export async function compressImageTo40KB(
  file: File,
  targetMaxBytes = TARGET_MAX_BYTES
): Promise<CompressedImageResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please select a valid image file (JPEG, PNG, or WebP).');
  }

  // Load image into an HTMLImageElement
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });

  let maxDimension = 900;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context is not supported in this browser.');
  }

  // Dimension scaling loop
  while (maxDimension >= 320) {
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    canvas.width = width;
    canvas.height = height;

    // High quality canvas scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, width, height);

    // Fill white background to avoid transparent PNG black artifacts in JPEG
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    // Loop quality from 0.85 down to 0.30
    for (let quality = 0.85; quality >= 0.28; quality -= 0.08) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
      });

      if (blob && blob.size <= targetMaxBytes) {
        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Extract base64 part without "data:image/jpeg;base64,"
            const commaIdx = result.indexOf(',');
            resolve(commaIdx !== -1 ? result.slice(commaIdx + 1) : result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const compressedDataUrl = `data:image/jpeg;base64,${base64Data}`;

        return {
          base64Data,
          dataUrl: compressedDataUrl,
          sizeBytes: blob.size,
          sizeFormatted: formatBytes(blob.size),
          width,
          height,
          contentType: 'image/jpeg',
          fileName: file.name.replace(/\.[^/.]+$/, '') + '.jpg',
        };
      }
    }

    // Still too large, reduce max dimension and try again
    maxDimension -= 120;
  }

  throw new Error(
    `Unable to compress image below 40 KB (${formatBytes(targetMaxBytes)}). Please upload a clearer or simpler image.`
  );
}
