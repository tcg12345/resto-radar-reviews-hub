import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

export function SearchResultSkeleton() {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo */}
          <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
          
          <div className="flex-1 space-y-2 min-w-0">
            {/* Restaurant name */}
            <Skeleton className="h-5 w-3/4" />
            
            {/* Rating and reviews */}
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-3 w-3 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-12" />
            </div>
            
            {/* Cuisine and price */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-2 w-1 rounded-full" />
              <Skeleton className="h-3 w-8" />
            </div>
            
            {/* Address */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          
          {/* Quick add button */}
          <div className="flex-shrink-0">
            <Skeleton className="h-8 w-16 rounded-lg" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}