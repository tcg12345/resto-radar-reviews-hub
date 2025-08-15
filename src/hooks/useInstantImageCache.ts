import { useEffect, useRef } from 'react';
import { resolveImageUrl } from '@/utils/imageUtils';

// Global image cache for instant loading
const globalImageCache = new Map<string, HTMLImageElement>();

export const useInstantImageCache = (imageUrls: string[]) => {
  const processed = useRef(new Set<string>());

  useEffect(() => {
    if (imageUrls.length === 0) return;

    imageUrls.forEach((url, index) => {
      if (processed.current.has(url)) return;
      processed.current.add(url);

      // Stagger loading to prevent browser overload
      setTimeout(() => {
        if (!globalImageCache.has(url)) {
          const img = new Image();
          img.src = resolveImageUrl(url, { width: 400 });
          
          img.onload = () => {
            globalImageCache.set(url, img);
          };
          
          img.onerror = () => {
            // Mark as processed even on error
            globalImageCache.set(url, img);
          };
        }
      }, index * 20); // 20ms stagger between images
    });
  }, [imageUrls]);

  return globalImageCache;
};