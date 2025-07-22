import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function FriendCardSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
          
          <div className="flex-1 space-y-2 min-w-0">
            {/* Username */}
            <Skeleton className="h-5 w-24" />
            
            {/* Name */}
            <Skeleton className="h-4 w-32" />
            
            {/* Stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex items-center gap-1">
                <Skeleton className="h-3 w-3" />
                <Skeleton className="h-3 w-8" />
              </div>
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}