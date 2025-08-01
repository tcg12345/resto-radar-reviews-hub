import { Skeleton } from '@/components/ui/skeleton';

interface CommunityPhotosSkeletonProps {
  count?: number;
}

export function CommunityPhotosSkeleton({ count = 12 }: CommunityPhotosSkeletonProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="aspect-square relative">
          <Skeleton className="w-full h-full rounded-lg" />
          {/* Shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_2s_infinite] rounded-lg" />
        </div>
      ))}
    </div>
  );
}