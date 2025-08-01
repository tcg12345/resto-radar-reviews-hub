import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function CommunityRatingSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>

          {/* Average Rating */}
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 space-y-2">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-4 w-16" />
            </div>

            {/* Rating Distribution */}
            <div className="flex-1 space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="h-3 w-8" />
                  <div className="flex-1 relative">
                    <Skeleton className="h-1.5 w-full rounded-full" />
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite] rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-4" />
                </div>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <Skeleton className="h-3 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}