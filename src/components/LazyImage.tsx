import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// Global cache to remember loaded images with localStorage persistence
const CACHE_KEY = 'lazy-image-cache';
const ERROR_CACHE_KEY = 'lazy-image-error-cache';

// Load cached images from localStorage on startup
const loadCacheFromStorage = (key: string): Set<string> => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
};

// Save cache to localStorage
const saveCacheToStorage = (key: string, cache: Set<string>) => {
  try {
    localStorage.setItem(key, JSON.stringify([...cache]));
  } catch {
    // Ignore localStorage errors
  }
};

const imageCache = loadCacheFromStorage(CACHE_KEY);
const errorCache = loadCacheFromStorage(ERROR_CACHE_KEY);

export const LazyImage = React.memo(({ src, alt, className, placeholderSrc, onLoad, onError }: LazyImageProps) => {
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
    // Persist to localStorage
    saveCacheToStorage(CACHE_KEY, imageCache);
    saveCacheToStorage(ERROR_CACHE_KEY, errorCache);
    onLoad?.();
  }, [src, onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    errorCache.add(src);
    // Remove from success cache if it was there
    imageCache.delete(src);
    // Persist to localStorage
    saveCacheToStorage(CACHE_KEY, imageCache);
    saveCacheToStorage(ERROR_CACHE_KEY, errorCache);
    onError?.();
  }, [src, onError]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setIsInView(true);
      }
    });
  }, []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node || isLoaded) return;
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold: 0.1,
      rootMargin: '50px'
    });
    observerRef.current.observe(node);
    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [handleIntersection, isLoaded, src]);

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-muted text-muted-foreground ${className}`}>
        <span className="text-xs">Failed to load</span>
      </div>
    );
  }

return (
  <div ref={containerRef} className={`relative ${className || ''}`}>
    {!isLoaded && (
      <>
        {placeholderSrc ? (
          <img
            src={placeholderSrc}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover blur-md scale-105 opacity-70"
            loading="eager"
          />
        ) : (
          <Skeleton className="absolute inset-0 w-full h-full" />
        )}
      </>
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