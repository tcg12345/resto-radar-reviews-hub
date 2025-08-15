import { useEffect, useRef } from 'react';
import { resolveImageUrl } from '@/utils/imageUtils';

// Global image cache for instant loading
const globalImageCache = new Map<string, HTMLImageElement>();

export const useInstantImageCache = (imageUrls: string[], maxPreload: number = 1) => {
  const processed = useRef(new Set<string>());

  useEffect(() => {
    if (imageUrls.length === 0) return;

    // Only preload first few images (usually just the first one)
    const urlsToPreload = imageUrls.slice(0, maxPreload);

    urlsToPreload.forEach((url, index) => {
      if (processed.current.has(url)) return;
      processed.current.add(url);

      // Immediate loading for first image, slight delay for others
      setTimeout(() => {
        if (!globalImageCache.has(url)) {
          const img = new Image();
          img.src = resolveImageUrl(url, { width: 400 });
          
          img.onload = () => {
            globalImageCache.set(url, img);
          };
          
          img.onerror = () => {
            globalImageCache.set(url, img);
          };
        }
      }, index * 10); // Very short stagger
    });
  }, [imageUrls, maxPreload]);

  return globalImageCache;
};

// Hook for on-demand loading when user navigates photos
export const useOnDemandImageLoader = () => {
  const loadImage = (url: string) => {
    if (globalImageCache.has(url)) return Promise.resolve();
    
    return new Promise<void>((resolve) => {
      const img = new Image();
      img.src = resolveImageUrl(url, { width: 400 });
      
      img.onload = () => {
        globalImageCache.set(url, img);
        resolve();
      };
      
      img.onerror = () => {
        globalImageCache.set(url, img);
        resolve();
      };
    });
  };

  return { loadImage };
};