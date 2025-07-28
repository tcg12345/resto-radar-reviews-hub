import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollLoaderProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  loadMoreText?: string;
  className?: string;
}

export function InfiniteScrollLoader({
  hasMore,
  isLoading,
  onLoadMore,
  loadMoreText = "Load More",
  className = ""
}: InfiniteScrollLoaderProps) {
  const observerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = observerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  if (!hasMore) {
    return null;
  }

  return (
    <div ref={observerRef} className={`flex justify-center py-4 ${className}`}>
      <Button
        onClick={onLoadMore}
        disabled={isLoading}
        variant="outline"
        className="min-w-32"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading...
          </>
        ) : (
          loadMoreText
        )}
      </Button>
    </div>
  );
}