import { useEffect, useRef } from 'react';
import { resolveImageUrl } from '@/utils/imageUtils';

interface UseImagePreloaderOptions {
  enabled?: boolean;
  maxConcurrent?: number;
}

export const useImagePreloader = (
  imageUrls: string[], 
  options: UseImagePreloaderOptions = {}
) => {
  const { enabled = true, maxConcurrent = 3 } = options;
  const preloadedRef = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || imageUrls.length === 0) return;

    const preloadBatch = async (urls: string[]) => {
      const promises = urls.map(url => {
        if (preloadedRef.current.has(url)) return Promise.resolve();
        
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            preloadedRef.current.add(url);
            resolve();
          };
          img.onerror = () => {
            preloadedRef.current.add(url); // Mark as attempted
            resolve();
          };
          img.src = resolveImageUrl(url, { width: 400 });
        });
      });

      await Promise.all(promises);
    };

    // Process in batches to avoid overwhelming the browser
    const processBatches = async () => {
      for (let i = 0; i < imageUrls.length; i += maxConcurrent) {
        const batch = imageUrls.slice(i, i + maxConcurrent);
        await preloadBatch(batch);
        // Small delay between batches
        if (i + maxConcurrent < imageUrls.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    };

    processBatches();
  }, [imageUrls, enabled, maxConcurrent]);

  return preloadedRef.current;
};