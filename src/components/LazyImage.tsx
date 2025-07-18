import React, { useState, useCallback, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Global cache to remember loaded images
const imageCache = new Set<string>();
const errorCache = new Set<string>();

export const LazyImage = React.memo(({ src, alt, className, onLoad, onError }: LazyImageProps) => {
  const [isLoaded, setIsLoaded] = useState(() => imageCache.has(src));
  const [hasError, setHasError] = useState(() => errorCache.has(src));
  const [isInView, setIsInView] = useState(false);

  // Check if image is already cached when component mounts
  useEffect(() => {
    if (imageCache.has(src)) {
      setIsLoaded(true);
      setIsInView(true); // If cached, we can show it immediately
    }
    if (errorCache.has(src)) {
      setHasError(true);
    }
  }, [src]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    imageCache.add(src);
    // Remove from error cache if it was there
    errorCache.delete(src);
    onLoad?.();
  }, [src, onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    errorCache.add(src);
    // Remove from success cache if it was there
    imageCache.delete(src);
    onError?.();
  }, [src, onError]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    });
  }, []);

  const imgRef = useCallback((node: HTMLDivElement | null) => {
    if (node && !isLoaded) {
      const observer = new IntersectionObserver(handleIntersection, {
        threshold: 0.1,
        rootMargin: '50px'
      });
      observer.observe(node);
      return () => observer.disconnect();
    }
  }, [handleIntersection, isLoaded]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <div ref={imgRef} className={className}>
      {!isLoaded && (
        <Skeleton className="absolute inset-0 w-full h-full" />
      )}
      {(isInView || isLoaded) && (
        <img
          src={src}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={handleLoad}
          onError={handleError}
          loading="lazy"
        />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';