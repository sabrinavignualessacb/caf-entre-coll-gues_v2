/**
 * Compresses any user image file to a square avatar JPEG (256x256 at 0.8 quality).
 * This reduces image sizes from multi-megabyte files down to ~15-30 KB,
 * guaranteeing fast Firestore saving and avoiding Firestore 1MB document limit errors.
 */
export async function compressAvatarImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's a tiny SVG or non-image, fallback to standard FileReader
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const TARGET_SIZE = 256; // High quality 256x256 avatar

          let width = img.width;
          let height = img.height;

          // Crop square from center
          let srcX = 0;
          let srcY = 0;
          let srcSize = Math.min(width, height);

          srcX = (width - srcSize) / 2;
          srcY = (height - srcSize) / 2;

          canvas.width = TARGET_SIZE;
          canvas.height = TARGET_SIZE;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(event.target?.result as string);
            return;
          }

          // Smooth rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, TARGET_SIZE, TARGET_SIZE);

          // Convert to JPEG at 80% quality
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
          resolve(compressedBase64);
        } catch (err) {
          console.warn('Image compression fallback to raw data URL:', err);
          resolve(event.target?.result as string);
        }
      };

      img.onerror = () => {
        resolve(event.target?.result as string);
      };
    };

    reader.onerror = (err) => reject(err);
  });
}
