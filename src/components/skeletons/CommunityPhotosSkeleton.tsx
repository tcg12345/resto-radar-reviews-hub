import { Skeleton } from '@/components/ui/skeleton';

interface CommunityPhotosSkeletonProps {
  count?: number;
}

export function CommunityPhotosSkeleton({ count = 12 }: CommunityPhotosSkeletonProps) {
  console.log('CommunityPhotosSkeleton rendering with count:', count);
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square">
          <div className="w-full h-full rounded-lg bg-muted animate-pulse skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}